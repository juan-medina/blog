---
layout: post
title: Optimizing Kubernetes Services - Part 1
date: 2019-12-28 00:00:00
author: Juan Medina
comments: true
categories: [Cloud,Programming]
image: /assets/img/graph.jpg
image-sm: /assets/img/graph.jpg
---

Much have been said about the importance of optimizing services that are going to run in a cloud, and they are plenty of resources about the topic, from start up times, memory consumption or resource usage and dozen of data points of your applications. 

But even with this amount of information it get exponentially complex to understand why we are doing this?, and what actually means?. So I decided that is going to be simpler to just [learn by example](https://github.com/LearningByExample){:target="_blank"}, so this is the first part of a series of articles that will help on this matter.

We are going to create a series of services that we will deploy in our kubernetes (k8s) cluster, and we will learn how we could measure them. Them we will optimizing our service to perform better, so we could measure if what we have done improves using data we could use to understand why.

In this first part on the series we will create our base service that will be use as a baseline for comparing the improvements that will be doing down the line, for this our service will be developed with default values, including configuration, forgetting things that we usually do for optimizing an application in order to understand what those optimizations actually do.

We will use the Microk8s cluster that [we recently setup]({{ site.baseurl }}{% link _posts/2019-12-02-microk8s.md %}){:target="_blank"} and the movies database that have been loaded with the [previous k8s job]({{ site.baseurl }}{% link _posts/2019-12-16-jobs-k8s.md %}){:target="_blank"}.

**Bootstrapping a Spring Boot application**

We are going to use Spring Initializr [https://start.spring.io/](https://start.spring.io/){:target="_blank"} to quickly bootstrap our application.

We will create a *Maven Project* using *Java 8* and *Spring Boot* version *2.2.2*, we will set the *Group* to be *org.learning.by.example.movies*, and the *Artifact* to *base-service*, the rest of the values should be automatically populated.

[![Spring Initializr setup](/assets/img/captures/base_movies_services_01.jpg){:style="width:80%; display:block; margin-left:auto; margin-right:auto;"}](/assets/img/captures/base_movies_services_01.jpg){:target="_blank"}


For dependencies we will search and add :
- Spring Web
- Spring Boot Actuator
- Spring Data JDBC
- PostgreSQL Driver

[![Spring Initializr dependencies](/assets/img/captures/base_movies_services_02.jpg){:style="width:80%; display:block; margin-left:auto; margin-right:auto;"}](/assets/img/captures/base_movies_services_02.jpg){:target="_blank"}


Now we will click on Generate to download our zip file : *base-service.zip*, we will uncompress it and leave it ready to be opened with our favorite IDE.

**Designing the Service**

Before starting to code our application we will design what our application will do, so first lest just look at our movies table loaded in our database, for
this we will do as been doing before using just the PSQL client to explore the data.

Lest explore the data using PSQL, we will login in our server with our *moviesuser* user so we need to get it password, we could get it with:

{% highlight bash %}
$ microk8s.kubectl get secret moviesuser.movies-db-cluster.credentials -o 'jsonpath={.data.password}' | base64 -d 
9oYUFcamSKwjB5Yrg099glLHdqg8C1IkScRfd5TeHTisiuj23FQrx3YEW6fB3ctJ
{% endhighlight %}

We will forward the PostgreSQL port 5432 on our master to our localhost port 6432, this will run until we do *ctrl+c* :

{% highlight bash %}
$ microk8s.kubectl port-forward movies-db-cluster-0 6432:5432                        
Forwarding from 127.0.0.1:6432 -> 5432
Forwarding from [::1]:6432 -> 5432
{% endhighlight %}

Finally we can connect to our database with with the provide user and password using PSQL in another
shell :

{% highlight bash %}
$ psql -h localhost -p 6432 -U moviesuser movies
Password for user moviesuser: 
psql (11.6 (Ubuntu 11.6-1.pgdg18.04+1), server 11.5 (Ubuntu 11.5-1.pgdg18.04+1))
SSL connection (protocol: TLSv1.3, cipher: TLS_AES_256_GCM_SHA384, bits: 256, compression: off)
Type "help" for help.

movies=# SELECT * FROM movies LIMIT 10;
 id |               title                |                   genres                    
----+------------------------------------+---------------------------------------------
  1 | Toy Story (1995)                   | Adventure|Animation|Children|Comedy|Fantasy
  2 | Jumanji (1995)                     | Adventure|Children|Fantasy
  3 | Grumpier Old Men (1995)            | Comedy|Romance
  4 | Waiting to Exhale (1995)           | Comedy|Drama|Romance
  5 | Father of the Bride Part II (1995) | Comedy
  6 | Heat (1995)                        | Action|Crime|Thriller
  7 | Sabrina (1995)                     | Comedy|Romance
  8 | Tom and Huck (1995)                | Adventure|Children
  9 | Sudden Death (1995)                | Action
 10 | GoldenEye (1995)                   | Action|Adventure|Thriller
(10 rows)

movies=# \q
{% endhighlight %}

As we can see we have a in our *movies* table a column id, as the key of each movie, a column name *title* that sometimes contains a year and a list of *genres*, separate with the the character \|.

We will do a REST API that returns all the movies from a given genre, but since they are just in a column we need to prepare an special query for it.

{% highlight SQL %}
SELECT
    id, title, genres
FROM
    movies
WHERE 
    'sci-fi' = ANY(string_to_array(LOWER(genres),'|'))
{% endhighlight %}

We will use the PostgreSQL function [string_to_array](https://www.postgresql.org/docs/current/functions-array.html){:target="_blank"} and the [ANY](https://www.postgresql.org/docs/9.2/functions-subquery.html#FUNCTIONS-SUBQUERY-ANY-SOME){:target="_blank"} operator for getting all the movies from a given genre, converted to lowercase using the string function [lower](https://www.postgresql.org/docs/9.1/functions-string.html){:target="_blank"}.

This could return thousands of row, for example for sci-fi will be around 3.5k but that is what we like to do in our service.

Let's check if with just 10 rows in PSQL

{% highlight bash %}
$ psql -h localhost -p 6432 -U moviesuser movies
Password for user moviesuser: 
psql (11.6 (Ubuntu 11.6-1.pgdg18.04+1), server 11.5 (Ubuntu 11.5-1.pgdg18.04+1))
SSL connection (protocol: TLSv1.3, cipher: TLS_AES_256_GCM_SHA384, bits: 256, compression: off)
Type "help" for help.

movies=> SELECT
movies->     id, title, genres
movies-> FROM
movies->     movies
movies-> WHERE 
movies->     'sci-fi' = ANY(string_to_array(LOWER(genres),'|'))
movies-> LIMIT 10;
 id  |                  title                   |                 genres                 
-----+------------------------------------------+------------------------------------------
  24 | Powder (1995)                            | Drama|Sci-Fi
  32 | Twelve Monkeys (a.k.a. 12 Monkeys) (1995)| Mystery|Sci-Fi|Thriller
  66 | Lawnmower Man 2: Beyond Cyberspace (1996)| Action|Sci-Fi|Thriller
  76 | Screamers (1995)                         | Action|Sci-Fi|Thriller
 103 | Unforgettable (1996)                     | Mystery|Sci-Fi|Thriller
 160 | Congo (1995)                             | Action|Adventure|Mystery|Sci-Fi
 172 | Johnny Mnemonic (1995)                   | Action|Sci-Fi|Thriller
 173 | Judge Dredd (1995)                       | Action|Crime|Sci-Fi
 196 | Species (1995)                           | Horror|Sci-Fi
 198 | Strange Days (1995)                      | Action|Crime|Drama|Mystery|Sci-Fi|Thriller
(10 rows)

movies=> \q
{% endhighlight %}

The query seems to work, now lets think on our API, we will create an endpoint in the url */movies/genre* that will return all movies under that category as an array of JSON object, but this can not be directly the row in our database it should a bit better, we will design a movie JSON like this :

{% highlight json %}
{
    "id": 24,
    "year": 1995,
    "genres": [
        "Drama",
        "Sci-Fi"
    ],        
    "title": "Powder",        
}
{% endhighlight %}

**Implementing our Service**

Back to our Service that was generated before we will open it in our favorite IDE and start adding the code require for our service to work.

First we will create a Plain Old Java Object, POJO, class that represents our Movie JSON Object, we will place it in _src/main/java/org/learning/by/example/movies/baseservice/model/Movie.java_ :

{% highlight java %}
package org.learning.by.example.movies.baseservice.model;

import java.util.List;

public class Movie {
    private final Integer id;
    private final String title;
    private final Integer year;
    private final List<String> genres;

    public Movie(final Integer id, final String title, final Integer year, List<String> genres) {
        this.id = id;
        this.title = title;
        this.year = year;
        this.genres = genres;
    }

    public Integer getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public Integer getYear() {
        return year;
    }

    public List<String> getGenres() {
        return genres;
    }
}
{% endhighlight %}

This class when deserialize will be just as our designed JSON, now we need we will create our repository that will query database on _src/main/java/org/learning/by/example/movies/baseservice/repositories/MoviesRepository.java_ :

{% highlight java %}
package org.learning.by.example.movies.baseservice.repositories;

import org.learning.by.example.movies.baseservice.model.Movie;
import org.springframework.data.jdbc.repository.query.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MoviesRepository extends CrudRepository<Movie, Integer> {
    @Query(value = "SELECT \n" +
            "  m.id, m.title, m.genres \n" +
            " FROM \n" +
            "  movies as m \n" +
            " WHERE :genre = ANY(string_to_array(LOWER(m.genres),'|')) \n")
    List<Movie> findByGenre(String genre);
}
{% endhighlight %}

In this simple repository we will extend from _CrudRepository_ to return a Movie List giving a genre, we will use the query that we design before. 

But the output of this query does not mach our _Movie Classs_ so we need to create a mapper that will convert a row from our database, we will place on     src/main/java/org/learning/by/example/movies/baseservice/mapper/MovieMapper.java : 

{% highlight java %}
package org.learning.by.example.movies.baseservice.mapper;

import org.learning.by.example.movies.baseservice.model.Movie;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Component
public class MovieMapper implements RowMapper<Movie> {
    // Without escape characters this pattern ins : (.*) \((\d{4})\)
    //  (       = START GROUP 1
    //  .*      = any set of characters
    //  )       = END GROUP 1
    //          = space
    //  \(      = the character (
    //  (       = START GROUP 2
    //  d{4}    = four digits, ex 1945
    //  )       = END GROUP 2
    //  \)      = the character ) 
    final static Pattern TITLE_YEAR_PATTERN = Pattern.compile("(.*) \\((\\d{4})\\)");

    @Override
    public Movie mapRow(final ResultSet resultSet, final int i) throws SQLException {
        final String rowTile = resultSet.getString("title");

        final String realTitle;
        final int year;

        final Matcher matcher = TITLE_YEAR_PATTERN.matcher(rowTile);
        if (matcher.find()) {
            realTitle = matcher.group(1);
            year = Integer.parseInt(matcher.group(2));
        } else {
            realTitle = rowTile;
            year = 1900;
        }

        final String[] genres = resultSet.getString("genres").split("\\|");
        final List<String> genresList = Arrays.stream(genres).filter(
                genre -> !genre.isEmpty()
        ).collect(Collectors.toList());

        final int id = resultSet.getInt("id");

        return new Movie(id, realTitle, year, genresList);
    }
}
{% endhighlight %}

This simple _RowMapper_ will first use a regular expression to get our movie title and year, if it is available, parse the genres and produce a Movie object, however is not enough to have a mapper we need to tell Spring Data JDBC to use it when query for our Movies so we will set this in a new configuration class on src/main/java/org/learning/by/example/movies/baseservice/repositories/MappingConfiguration.java :

{% highlight java %}
package org.learning.by.example.movies.baseservice.repositories;

import org.learning.by.example.movies.baseservice.mapper.MovieMapper;
import org.learning.by.example.movies.baseservice.model.Movie;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jdbc.repository.config.DefaultQueryMappingConfiguration;

@Configuration
public class MappingConfiguration extends DefaultQueryMappingConfiguration {
    MappingConfiguration(final MovieMapper movieMapper) {
        super();
        registerRowMapper(Movie.class, movieMapper);
    }
}
{% endhighlight %}

In this _MappingConfiguration_ we are registering our MovieMapper for mapping _Movies_ objects, note that we use dependency constructor injection for obtain the
bean for our _MovieMapper_.

We will create now a service that will provide movies to who ever request them, to been able to change the implementation of our repository if needed and we will place it on _src/main/java/org/learning/by/example/movies/baseservice/service/MovieService.java_ :

{% highlight java %}
package org.learning.by.example.movies.baseservice.service;

import org.learning.by.example.movies.baseservice.model.Movie;
import org.learning.by.example.movies.baseservice.repositories.MoviesRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MovieService {
    private final MoviesRepository repository;

    public MovieService(final MoviesRepository repository) {
        this.repository = repository;
    }

    public List<Movie> getMoviesByGenre(final String genre) {
        return repository.findByGenre(genre.toLowerCase());
    }
}
{% endhighlight %}

The *MovieService class* will as well convert to lowercase the genre, since our repository will be perform the query on lowercase genres.

Now we will create our api using a *RestController* and we will place it on src/main/java/org/learning/by/example/movies/baseservice/controller/MoviesController.java : 

{% highlight java %}
package org.learning.by.example.movies.baseservice.controller;

import org.learning.by.example.movies.baseservice.model.Movie;
import org.learning.by.example.movies.baseservice.service.MovieService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class MoviesController {
    private final MovieService movieService;

    public MoviesController(final MovieService movieService) {
        this.movieService = movieService;
    }

    @GetMapping("/movies/{genre}")
    List<Movie> getMovies(@PathVariable String genre) {
        return movieService.getMoviesByGenre(genre);
    }
}
{% endhighlight %}

Our *MovieController* will answer HTTP GET request on /movies/{genre} and return the movies using the *MoviesService* that will use our *MoviesRepository*, however we need to stablish the connection to our database but first let thinks how this will run on our k8s cluster.

When the service is running we need to connect to our database we could use the environment variables provide by kubernetes to connect to find the IP address and port, as we did in the [last example]({{ site.baseurl }}{% link _posts/2019-12-16-jobs-k8s.md %}){:target="_blank"}, this are _MOVIES_DB_CLUSTER_SERVICE_HOST}_ and _MOVIES_DB_CLUSTER_SERVICE_PORT_POSTGRESQL_, but we need as well the credentials that we could inject in our kubernetes deployment, as we did before, in a directory containing a username and password. Finally we need to tell spring witch database driver to use, and the JDBC connection string, for this let's add to our src/main/resources/application.yml some entries : 

{% highlight yaml %}
movies-datasource:
  driver: "org.postgresql.Driver"
  connection-string: "jdbc:postgresql://\
    ${MOVIES_DB_CLUSTER_SERVICE_HOST}:${MOVIES_DB_CLUSTER_SERVICE_PORT_POSTGRESQL}\
    /movies"
  credentials: "/etc/movies-db"
{% endhighlight %}

Let's get those values using a *ConfigurationProperties* that will be on src/main/java/org/learning/by/example/movies/baseservice/datasource/DataSourceProperties.java : 

{% highlight java %}
package org.learning.by.example.movies.baseservice.datasource;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties("movies-datasource")
public class DataSourceProperties {
    public String getDriver() {
        return driver;
    }

    public void setDriver(String driver) {
        this.driver = driver;
    }

    public String getConnectionString() {
        return connectionString;
    }

    public void setConnectionString(String connectionString) {
        this.connectionString = connectionString;
    }

    public String getCredentials() {
        return credentials;
    }

    public void setCredentials(String credentials) {
        this.credentials = credentials;
    }

    private String driver;
    private String connectionString;
    private String credentials;
}
{% endhighlight %}

Now that we have our *DataSourceProperties* we could create a *DataSource* for our connection on src/main/java/org/learning/by/example/movies/baseservice/datasource/MoviesDataSource.java : 

{% highlight java %}
package org.learning.by.example.movies.baseservice.datasource;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Component
public class MoviesDataSource extends DriverManagerDataSource {
    private static final Log log = LogFactory.getLog(MoviesDataSource.class);

    MoviesDataSource(final DataSourceProperties dataSourceProperties) {
        super();
        this.setDriverClassName(dataSourceProperties.getDriver());
        setUrl(dataSourceProperties.getConnectionString());
        final String credentials = dataSourceProperties.getCredentials();
        this.setUsername(getCredentialValue(credentials, "username"));
        this.setPassword(getCredentialValue(credentials, "password"));
    }

    private String getCredentialValue(final String credentials, final String value) {
        final Path path = Paths.get(credentials, value);
        try {
            return new String(Files.readAllBytes(path));
        } catch (Exception ex) {
            throw new RuntimeException("error getting data source credential value : " + path.toString(), ex);
        }
    }
}
{% endhighlight %}

We are creating a DriverManagerDataSource with the settings in our application.yml and reading the username and password from our credentials directory.

Finally we will modify our application on src/main/java/org/learning/by/example/movies/baseservice/BaseServiceApplication.java :


{% highlight java %}
package org.learning.by.example.movies.baseservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jdbc.repository.config.EnableJdbcRepositories;

@SpringBootApplication
@EnableJdbcRepositories
public class BaseServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(BaseServiceApplication.class, args);
    }
}
{% endhighlight %}

We just enable JDBC repositories in our application. 

_Note: For make this article brief we haven't include the unit and integrations tests created for this code, but they are available on the [repository](https://github.com/LearningByExample/movies-base-service){:target="_blank"} for this article._

**Running our Service in Local**

Before start working on deploying the service into our k8s cluster we will run it locally, but since our configuration use a couple of environments variables and some credentials files for this. 

First let's get our user password with : 

{% highlight bash %}
$ microk8s.kubectl get secret moviesuser.movies-db-cluster.credentials -o 'jsonpath={.data.password}' | base64 -d 
9oYUFcamSKwjB5Yrg099glLHdqg8C1IkScRfd5TeHTisiuj23FQrx3YEW6fB3ctJ
{% endhighlight %}

Now will we save it to a file named _/etc/movies-db/password_, we will create as well a file name _/etc/movies-db/username_ that just contains our user : _moviesuser_.

We will build our microservice with : 

{% highlight bash %}
$ ./mvnw clean package
{% endhighlight %}

We will forward the PostgreSQL port 5432 on our master to our localhost port 6432, this will run until we do *ctrl+c* :

{% highlight bash %}
$ microk8s.kubectl port-forward movies-db-cluster-0 6432:5432
Forwarding from 127.0.0.1:6432 -> 5432
Forwarding from [::1]:6432 -> 5432
{% endhighlight %}

In a new shell window we could run out service, this will run until we do *ctrl+c* :

{% highlight bash %}
$ export MOVIES_DB_CLUSTER_SERVICE_HOST="localhost"
$ export MOVIES_DB_CLUSTER_SERVICE_PORT_POSTGRESQL="6432"
$ java -jar target/base-service-0.0.1-SNAPSHOT.jar
{% endhighlight %}

Now we could test our service using any HTPP client, such wget, curl, etc., I going to use [HTTPie](https://httpie.org/){:target="_blank"} instead : 

{% highlight bash %}
$ http :8080/movies/sci-fi       
HTTP/1.1 200 
Connection: keep-alive
Content-Type: application/json
Date: Wed, 01 Jan 2020 12:13:46 GMT
Keep-Alive: timeout=60
Transfer-Encoding: chunked

[
    {
        "genres": [
            "Drama",
            "Sci-Fi"
        ],
        "id": 24,
        "title": "Powder",
        "year": 1995
    },
    {
        "genres": [
            "Adventure",
            "Drama",
            "Fantasy",
            "Mystery",
            "Sci-Fi"
        ],
        "id": 29,
        "title": "City of Lost Children, The (Cité des enfants perdus, La)",
        "year": 1995
    },
........
........
........
]
{% endhighlight %}

This will output thousands of records, these where just some of them.

**Building our Docker Image**

Now that we have test that our application runs correctly let's create a docker image and push it to our local repository that have in our cluster.

**Resources**

- [https://docs.spring.io/spring-data/jdbc/docs/current/reference/html/#jdbc.query-methods](https://docs.spring.io/spring-data/jdbc/docs/current/reference/html/#jdbc.query-methods){:target="_blank"}
- [https://www.baeldung.com/spring-jdbc-jdbctemplate](https://www.baeldung.com/spring-jdbc-jdbctemplate){:target="_blank"}
- [https://hub.docker.com/\_/openjdk](https://hub.docker.com/_/openjdk){:target="_blank"}
- [https://spring.io/guides/gs/spring-boot-docker/](https://spring.io/guides/gs/spring-boot-docker/){:target="_blank"}
- [https://spring.io/guides/gs/spring-boot-kubernetes/](https://spring.io/guides/gs/spring-boot-kubernetes/){:target="_blank"}
- [https://www.baeldung.com/spring-boot-kubernetes-self-healing-apps](https://www.baeldung.com/spring-boot-kubernetes-self-healing-apps){:target="_blank"}
- [http://jmeter.apache.org/usermanual/hints_and_tips.html#hidpi](http://jmeter.apache.org/usermanual/hints_and_tips.html#hidpi){:target="_blank"}
- [https://jmeter.apache.org/usermanual/best-practices.html](https://jmeter.apache.org/usermanual/best-practices.html){:target="_blank"}