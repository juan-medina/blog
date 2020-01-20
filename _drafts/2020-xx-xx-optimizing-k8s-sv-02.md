---
layout: post
title: Optimizing Kubernetes Services - Part 2 &#58 Spring Web
date: 2020-01-12 23:00:00
author: Juan Medina
comments: true
categories: [Cloud,Programming]
image: /assets/img/graph.jpg
image-sm: /assets/img/graph.jpg
---

Some days ago we start this series of article with our [base example]({{ site.baseurl }}{% link _posts/2020-01-11-optimizing-k8s-sv-01.md %}){:target="_blank"}, now we have baseline that we could use to optimize the service. 


These are the number that we got, the ones that we will like to improve :

{% include table.html table=site.data.optimizing-k8s-sv-02.tables.table-1 %}

**Moving from Java 8 to Java 11**

For this example we will first clone our [original project](https://github.com/LearningByExample/movies-base-service){:target="_blank"} :

{% highlight bash %}
$ git clone https://github.com/LearningByExample/movies-spring-web.git movies-spring-web
{% endhighlight %}

Now we will rename all references in code, scripts, yaml and packages from *movies-base-service* to *movies-spring-web*

Them we will modify our *pom.xml*  to use Java 11 :

{% highlight xml %}
    <properties>
        <java.version>11</java.version>
    </properties>
{% endhighlight %}

Finally we will change our Dockerfile to use the Java 11 base image : 

{% highlight docker %}
FROM openjdk:11-jdk

COPY target/*.jar /usr/app/app.jar
WORKDIR /usr/app

CMD ["java", "-jar", "app.jar"]
{% endhighlight %}

With this changes we will build and deploy our new service : 

{% highlight bash %}
$ ./build.sh
$ ./deploy.sh
{% endhighlight %}

We could now check that is deployed in our local cluster :

{% highlight bash %}
$ microk8s.kubectl get all --selector=app=movies-spring-web
NAME                                     READY   STATUS    RESTARTS   AGE
pod/movies-spring-web-66b94f8479-mmmxw   1/1     Running   0          17s

NAME                        TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
service/movies-spring-web   ClusterIP   10.152.183.195   <none>        8080/TCP   17s

NAME                                READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/movies-spring-web   1/1     1            1           17s

NAME                                           DESIRED   CURRENT   READY   AGE
replicaset.apps/movies-spring-web-66b94f8479   1         1         1       17s
{% endhighlight %}

We could check that our service is running correctly with [HTTPie](https://httpie.org/){:target="_blank"} : 

{% highlight bash %}
$ http 10.152.183.195:8080/movies/sci-fi
HTTP/1.1 200 
Connection: keep-alive
Content-Type: application/json
Date: Sat, 18 Jan 2020 12:20:31 GMT
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

With this we could do our load test following exactly the procedure that we describe in our [previous example]({{ site.baseurl }}{% link _posts/2020-01-11-optimizing-k8s-sv-01.md %}){:target="_blank"}, but this time only for 10 concurrent users.


{% highlight bash %}
$ ./load-test.sh 10 600 60
{% endhighlight %}

Doing this we will get this results from the JMeter report and Grafana :

{% include table.html table=site.data.optimizing-k8s-sv-02.tables.table-2 %}

With this we could see that we have a better ART, TPS and Max CPU but we have increase the memory usage.

**Creating a optimal JRE**

One thing that we haven't check so far is the size of our image, that may not be important for a performance perspective but it is for how fast our cluster could get install the image, let's check it out with :

{% highlight bash %}
$ docker image ls localhost:32000/movies-spring-web:0.0.1
REPOSITORY                          TAG                 IMAGE ID            CREATED             SIZE
localhost:32000/movies-spring-web   0.0.1               491c3e0b1fdf        37 minutes ago      628MB
{% endhighlight %}

In java 11 we could use [jlink](Jlink){:target="_blank"} to generate a optimize JRE distribution that will contains only what our application needs, for this we will create an script named jlink.sh : 

{% highlight bash %}
#!/bin/sh -

set -o errexit

BASE_DIR="$(
  cd "$(dirname "$0")"
  pwd -P
)"

DEPS_DIR="$BASE_DIR/deps"

mkdir -p "$DEPS_DIR"

echo "extracting jar"
cd "$DEPS_DIR"
jar -xf ../*.jar
echo "jar extracted"

echo "generate JVM modules list"
EX_JVM_DEPS="jdk.crypto.ec"
JVM_DEPS=$(jdeps -s --multi-release 11 -recursive -cp BOOT-INF/lib/*.jar BOOT-INF/classes | \
  grep -Po '(java|jdk)\..*' | \
  sort -u | \
  tr '\n' ',')
MODULES="$JVM_DEPS$EX_JVM_DEPS"
echo "$MODULES"
echo "JVM modules list generated"

echo "doing jlink"
jlink \
    --verbose \
    --module-path "$JAVA_HOME/jmods", \
    --add-modules "$MODULES" \
    --compress 2 \
    --no-header-files \
    --no-man-pages \
    --strip-debug \
    --output "$DEPS_DIR/jre-jlink"

echo "jlink done"

cd "$BASE_DIR"
{% endhighlight %}

In this script we will uncompress our jar, use [jdeps](https://docs.oracle.com/javase/8/docs/technotes/tools/unix/jdeps.html){:target="_blank"} to find witch modules are in use, we will add additionally *jdk.crypto.ec* since we require to connect via ssl to our PostgreSQL cluster, and then produce a optimize JRE image using jlink. 

Now we will modify our Dockerfile to perform a multi-stage build :

{% highlight docker %}
FROM openjdk:11 AS builder

COPY target/*.jar /app/app.jar
COPY jlink.sh /app/jlink.sh

WORKDIR /app
RUN ./jlink.sh

FROM openjdk:11-jre-slim

RUN rm -rf /usr/local/openjdk-11
COPY --from=builder /app/deps/jre-jlink /usr/local/openjdk-11
COPY --from=builder /app/app.jar /app/app.jar

WORKDIR /app

CMD ["java", "-jar", "app.jar"]
{% endhighlight %}

In this docker file we create a intermediate container named builder base on the openjdk 11 image, we will use this container to extract our application jar and invoke our jlink.sh script.

Them our Dockerfile will create a image base on the JRE 11 slim and will add our application and replace the provide JRE with the one that we created with jlink in the builder image. We use the base JRE image since our custom JRE requires libraries and configuration that are already present in that image.

We could build our container as before and the check the image size : 

{% highlight bash %}
$ docker image ls localhost:32000/movies-spring-web:0.0.1
REPOSITORY                          TAG                 IMAGE ID            CREATED             SIZE
localhost:32000/movies-spring-web   0.0.1               3fc95b166643        10 seconds ago      279MB
{% endhighlight %}

Now we will run our performance test as before to get  :

{% include table.html table=site.data.optimizing-k8s-sv-02.tables.table-3 %}

We could see that there is not major changes using a JRE build with jlink, our docker is just smaller, that will help when we need to install a image into our cluster but will not benefit in overall to response time or even the memory that we use.

**Checking the Memory Usage**

The things that sound a bit odd and we will try to explain next is why we are using so much memory, so we need a tool to understand this futher so we will use [VisualVM](https://visualvm.github.io/){:target="_blank"}, but first we will need to modify our deployment in order been able to pass parameters to the JVM when we start our service, and we will to enable the JMX port that we will use.

First we will modify our Dockerfile : 

{% highlight docker %}
FROM openjdk:11 AS builder

COPY target/*.jar /app/app.jar
COPY jlink.sh /app/jlink.sh

WORKDIR /app
RUN ./jlink.sh

FROM openjdk:11-jre-slim

RUN rm -rf /usr/local/openjdk-11
COPY --from=builder /app/deps/jre-jlink /usr/local/openjdk-11
COPY --from=builder /app/app.jar /app/app.jar

WORKDIR /app

ENTRYPOINT ["sh", "-c", "java ${JAVA_OPTS} -jar /app/app.jar"]
{% endhighlight %}

We will have now an environment variable named *JAVA_OPTS* to set additional parameters when running our java service.

Now we will modify our deployment.yml :

{% highlight yaml %}
apiVersion: apps/v1
kind: Deployment
metadata:
  creationTimestamp: null
  labels:
    app: movies-spring-web
  name: movies-spring-web
spec:
  replicas: 1
  selector:
    matchLabels:
      app: movies-spring-web
  strategy: {}
  template:
    metadata:
      creationTimestamp: null
      labels:
        app: movies-spring-web
    spec:
      containers:
        - image: localhost:32000/movies-spring-web:0.0.1
          imagePullPolicy: Always
          name: movies-spring-web
          resources: {}
          env:
            - name: "JAVA_OPTS"
              value: >-
                -Dcom.sun.management.jmxremote 
                -Dcom.sun.management.jmxremote.port=12345 
                -Dcom.sun.management.jmxremote.authenticate=false 
                -Dcom.sun.management.jmxremote.ssl=false
          readinessProbe:
            httpGet:
              path: /actuator/health
              port: 8080
          livenessProbe:
            httpGet:
              path: /actuator/info
              port: 8080
          volumeMounts:
            - name: db-credentials
              mountPath: "/etc/movies-db"
              readOnly: true
            - name: tmp
              mountPath: "/tmp"
              readOnly: false
      volumes:
        - name: db-credentials
          secret:
            secretName: moviesuser.movies-db-cluster.credentials
        - name: tmp
          emptyDir: {}
status: {}
---
apiVersion: v1
kind: Service
metadata:
  creationTimestamp: null
  labels:
    app: movies-spring-web
  name: movies-spring-web
spec:
  ports:
    - name: 8080-8080
      port: 8080
      protocol: TCP
      targetPort: 8080
  selector:
    app: movies-spring-web
  type: ClusterIP
status:
  loadBalancer: {}
{% endhighlight %}

But in order to use JMX we need to add to our jlink.sh the *jdk.management.agent* module : 

{% highlight bash %}
#!/bin/sh -

set -o errexit

BASE_DIR="$(
  cd "$(dirname "$0")"
  pwd -P
)"

DEPS_DIR="$BASE_DIR/deps"

mkdir -p "$DEPS_DIR"

echo "extracting jar"
cd "$DEPS_DIR"
jar -xf ../*.jar
echo "jar extracted"

echo "generate JVM modules list"
EX_JVM_DEPS="jdk.crypto.ec,jdk.management.agent"
JVM_DEPS=$(jdeps -s --multi-release 11 -recursive -cp BOOT-INF/lib/*.jar BOOT-INF/classes | \
  grep -Po '(java|jdk)\..*' | \
  sort -u | \
  tr '\n' ',')
MODULES="$JVM_DEPS$EX_JVM_DEPS"
echo "$MODULES"
echo "JVM modules list generated"

echo "doing jlink"
jlink \
    --verbose \
    --module-path "$JAVA_HOME/jmods", \
    --add-modules "$MODULES" \
    --compress 2 \
    --no-header-files \
    --no-man-pages \
    --strip-debug \
    --output "$DEPS_DIR/jre-jlink"

echo "jlink done"

cd "$BASE_DIR"
{% endhighlight %}

Not we will and deploy our application.

{% highlight bash %}
$ ./build.sh
$ ./deploy.sh
{% endhighlight %}

Now we will forward our port 12345 for the pod to our localhost :

{% highlight bash %}
$ microk8s.kubectl get pod --selector=app=movies-spring-web   
NAME                                 READY   STATUS    RESTARTS   AGE
movies-spring-web-6554d5fd68-kxvxg   1/1     Running   0          7m52s

$ microk8s.kubectl port-forward movies-spring-web-6554d5fd68-kxvxg 12345:12345
Forwarding from 127.0.0.1:12345 -> 12345
Forwarding from [::1]:12345 -> 12345
{% endhighlight %}

Now we should open VisualVM and add a JMX connection to our service on *locahost:12345* :

[![VisualVM ](/assets/img/captures/movies_spring_web_01.jpg){:style="width:80%; display:block; margin-left:auto; margin-right:auto;"}](/assets/img/captures/movies_spring_web_01.jpg){:target="_blank"}

Now we could click on our application and the select the tab monitor to see some graphs, I choose to only see CPU and threads : 

[![VisualVM ](/assets/img/captures/movies_spring_web_02.jpg){:style="width:80%; display:block; margin-left:auto; margin-right:auto;"}](/assets/img/captures/movies_spring_web_02.jpg){:target="_blank"}

As we could see our heap is about 1GB, with a maximun of 16GB however we are only using 80M at peak, we could see in the CPU that our garbage collector is almost doing nothing until he enter a cleaning cycle the an small CPU usage and our heap usage drops.

In this moment we do not have any traffic on the service, lest run our load test for a couple of minutes. 

{% highlight bash %}
$ ./load-test.sh 10 120 30
{% endhighlight %}

I'll leave a couple of minutes after the test to wait that the garbage collector start again and grab more data from VisualVM : 

[![VisualVM ](/assets/img/captures/movies_spring_web_03.jpg){:style="width:80%; display:block; margin-left:auto; margin-right:auto;"}](/assets/img/captures/movies_spring_web_03.jpg){:target="_blank"}

As we could see know we use around 435M of heap, and the gc busy during our test, them we could see how drops afterwards.

Let's make a bit of sense on what we have seen so far. 

First we do not specify any memory limit on the deployment of our containers so that's the reason that our maximum heap is set to 16G, them even without using much initial heap but the JVM is prepare to use a full G if need, up to 16G if needs more. 

Our garbage collector is trying to do it best to keep up and clean memory when he could.

To just test some limit we could run more test with different loads but I think that with 450M should be ok and starting with 250M, so I going to change our VM options in our deployment : 

{% highlight yaml %}
apiVersion: apps/v1
kind: Deployment
metadata:
  creationTimestamp: null
  labels:
    app: movies-spring-web
  name: movies-spring-web
spec:
  replicas: 1
  selector:
    matchLabels:
      app: movies-spring-web
  strategy: {}
  template:
    metadata:
      creationTimestamp: null
      labels:
        app: movies-spring-web
    spec:
      containers:
        - image: localhost:32000/movies-spring-web:0.0.1
          imagePullPolicy: Always
          name: movies-spring-web
          resources: {}
          env:
            - name: "JAVA_OPTS"
              value: >-
                -Xms250m
                -Xmx450m
                -Dcom.sun.management.jmxremote
                -Dcom.sun.management.jmxremote.port=12345
                -Dcom.sun.management.jmxremote.authenticate=false
                -Dcom.sun.management.jmxremote.ssl=false
          readinessProbe:
            httpGet:
              path: /actuator/health
              port: 8080
          livenessProbe:
            httpGet:
              path: /actuator/info
              port: 8080
          volumeMounts:
            - name: db-credentials
              mountPath: "/etc/movies-db"
              readOnly: true
            - name: tmp
              mountPath: "/tmp"
              readOnly: false
      volumes:
        - name: db-credentials
          secret:
            secretName: moviesuser.movies-db-cluster.credentials
        - name: tmp
          emptyDir: {}
status: {}
---
apiVersion: v1
kind: Service
metadata:
  creationTimestamp: null
  labels:
    app: movies-spring-web
  name: movies-spring-web
spec:
  ports:
    - name: 8080-8080
      port: 8080
      protocol: TCP
      targetPort: 8080
  selector:
    app: movies-spring-web
  type: ClusterIP
status:
  loadBalancer: {}
{% endhighlight %}

We do not need to build our application again, since we are not changing our docker just deploy it : 

{% highlight bash %}
$ ./deploy.sh
{% endhighlight %}

Now we will forward the port again them connect with VisualVM and repeat the test for get a new graph : 

[![VisualVM ](/assets/img/captures/movies_spring_web_04.jpg){:style="width:80%; display:block; margin-left:auto; margin-right:auto;"}](/assets/img/captures/movies_spring_web_04.jpg){:target="_blank"}

Now we could see that our memory is better utilize, let's now restart our cluster and run our performance test again to check how it perform in comparison with the previous tests, first we modify our deployment to remove the jmx port but keep the heap configuration: 

{% highlight yaml %}
apiVersion: apps/v1
kind: Deployment
metadata:
  creationTimestamp: null
  labels:
    app: movies-spring-web
  name: movies-spring-web
spec:
  replicas: 1
  selector:
    matchLabels:
      app: movies-spring-web
  strategy: {}
  template:
    metadata:
      creationTimestamp: null
      labels:
        app: movies-spring-web
    spec:
      containers:
        - image: localhost:32000/movies-spring-web:0.0.1
          imagePullPolicy: Always
          name: movies-spring-web
          resources: {}
          env:
            - name: "JAVA_OPTS"
              value: >-
                -Xms250m
                -Xmx450m
          readinessProbe:
            httpGet:
              path: /actuator/health
              port: 8080
          livenessProbe:
            httpGet:
              path: /actuator/info
              port: 8080
          volumeMounts:
            - name: db-credentials
              mountPath: "/etc/movies-db"
              readOnly: true
            - name: tmp
              mountPath: "/tmp"
              readOnly: false
      volumes:
        - name: db-credentials
          secret:
            secretName: moviesuser.movies-db-cluster.credentials
        - name: tmp
          emptyDir: {}
status: {}
---
apiVersion: v1
kind: Service
metadata:
  creationTimestamp: null
  labels:
    app: movies-spring-web
  name: movies-spring-web
spec:
  ports:
    - name: 8080-8080
      port: 8080
      protocol: TCP
      targetPort: 8080
  selector:
    app: movies-spring-web
  type: ClusterIP
status:
  loadBalancer: {}
{% endhighlight %}


We will remove the jdk.management.agent module as well from our jlink.sh :

{% highlight bash %}
#!/bin/sh -

set -o errexit

BASE_DIR="$(
  cd "$(dirname "$0")"
  pwd -P
)"

DEPS_DIR="$BASE_DIR/deps"

mkdir -p "$DEPS_DIR"

echo "extracting jar"
cd "$DEPS_DIR"
jar -xf ../*.jar
echo "jar extracted"

echo "generate JVM modules list"
EX_JVM_DEPS="jdk.crypto.ec"
JVM_DEPS=$(jdeps -s --multi-release 11 -recursive -cp BOOT-INF/lib/*.jar BOOT-INF/classes | \
  grep -Po '(java|jdk)\..*' | \
  sort -u | \
  tr '\n' ',')
MODULES="$JVM_DEPS$EX_JVM_DEPS"
echo "$MODULES"
echo "JVM modules list generated"

echo "doing jlink"
jlink \
    --verbose \
    --module-path "$JAVA_HOME/jmods", \
    --add-modules "$MODULES" \
    --compress 2 \
    --no-header-files \
    --no-man-pages \
    --strip-debug \
    --output "$DEPS_DIR/jre-jlink"

echo "jlink done"

cd "$BASE_DIR"
{% endhighlight %}

Then we build & deploy our service :

{% highlight bash %}
$ ./build.sh
$ ./deploy.sh
{% endhighlight %}

And now we follow the procedure, including scaling and restart to perform a clean test : 

{% include table.html table=site.data.optimizing-k8s-sv-02.tables.table-4 %}

**Changing the garbage collector**

_Note: The full code of this service is available at this [repository](https://github.com/LearningByExample/movies-spring-web){:target="_blank"}._

**Resources**

- [https://spring.io/guides/topicals/spring-boot-docker](https://spring.io/guides/topicals/spring-boot-docker){:target="_blank"}
- https://docs.gigaspaces.com/xap/14.0/rn/java11-guidelines.html
- https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/
- https://spring.io/blog/2015/12/10/spring-boot-memory-performance
- https://stackoverflow.com/a/30070428