---
layout: post
title: PostgreSQL in Kubernetes
date: 2019-12-12 00:00:00
author: Juan Medina
comments: true
categories: [Cloud]
image: /assets/img/postgresql_k8s.png
image-sm: /assets/img/postgresql_k8s.png
---

[Last week]({{ site.baseurl }}{% link _posts/2019-12-02-microk8s.md %}){:target="_blank"} we manage to configure MicroK8s for having our own Kubernetes (k8s) cluster, so for learning a bit more on it we are going to learn how to install a [PostgreSQL](https://www.postgresql.org/){:target="_blank"} server that will be run natively in our cloud.

For installing PostgreSQL we are going to use a k8s [operator](https://kubernetes.io/docs/concepts/extend-kubernetes/operator/){:target="_blank"}, but first let's understand what an operator is.

Operators are software extensions to k8s that make use of custom resources to manage applications and their components. K8s’ controllers concept lets you extend the cluster’s behaviour without modifying the code of k8s itself. Operators are clients of the k8s API that act as controllers for a Custom Resource.

So basically we extended the functionality of our cluster to easily deploy applications that could automatize how they are deployed and configure.

Why use a operator to deploy a database server? Because databases in a cloud are really hard, we need to provision storage, manage replication, 
credentials for the clients, and a dozen of complicated and delicate details, an operator will automatize all of this for us.

For this we are going to use this [postgres-operator](https://github.com/zalando/postgres-operator){:target="_blank"}.

**Adding the Operator**

First we need to clone the repo:

{% highlight bash %}
$ git clone git@github.com:zalando/postgres-operator.git
{% endhighlight %}

_Note: Currently on version 1.2.0 of the operator there is a bug that is fixed but not released, we will patch the installation before._ Edit the file *manifests/postgres-operator.yaml* :

change
{% highlight yaml %}
        image: registry.opensource.zalan.do/acid/postgres-operator:v1.2.0
{% endhighlight %}
to:
{% highlight yaml %}
        image: registry.opensource.zalan.do/acid/postgres-operator:latest
{% endhighlight %}

_End Note_


Now we will install the operator using the manifests:

{% highlight bash %}
$ cd postgres-operator
$ microk8s.kubectl create -f manifests/configmap.yaml  # configuration
$ microk8s.kubectl create -f manifests/operator-service-account-rbac.yaml  # identity
$ microk8s.kubectl create -f manifests/postgres-operator.yaml  # deployment
{% endhighlight %}

Now to check that the operator has started we could do:

{% highlight bash %}
$ microk8s.kubectl get pod -l name=postgres-operator
NAME                                 READY   STATUS    RESTARTS   AGE
postgres-operator-66cc575d9c-jfnlj   1/1     Running   0          20s
{% endhighlight %}

**Creating a Database**

Operators work with resource, when we provide to k8s a resource with the data for a register operator it
will use it to install it.

For example les create a database named *movies* with and admin user name *moviesdba* and a  user named *moviesuser*.
For this we will create a file that will could name movies-db.yml :

{% highlight yaml %}
apiVersion: "acid.zalan.do/v1"
kind: postgresql
metadata:
  name: movies-db-cluster
  namespace: default
spec:
  teamId: "movies"
  volume:
    size: 1Gi
  numberOfInstances: 2
  users:
    moviesdba:  # database owner
    - superuser
    - createdb
    moviesuser: []  # roles
  databases:
    movies: moviesdba  # dbname: owner
  postgresql:
    version: "11"
{% endhighlight %}    

Now let's create our database using : 

{% highlight bash %}
$ microk8s.kubectl create -f movies-db.yml 
postgresql.acid.zalan.do/movies-db-cluster created
{% endhighlight %}    

Now we we need to wait that our database is running, we could check until we get this output :
{% highlight bash %}
$ microk8s.kubectl get postgresql
NAME                TEAM     VERSION   PODS   VOLUME   CPU-REQUEST   MEMORY-REQUEST   AGE    STATUS
movies-db-cluster   movies   11        2      1Gi                                     106s   Running
{% endhighlight %}    

And the inspect the nodes four our database with : 

{% highlight bash %}
$ microk8s.kubectl get pods -l application=spilo -L spilo-role
NAME                  READY   STATUS    RESTARTS   AGE     SPILO-ROLE
movies-db-cluster-0   1/1     Running   0          6m56s   master
movies-db-cluster-1   1/1     Running   0          6m15s   replica
{% endhighlight %}

As we could see our database has a master and a replica running.

**Accessing our database**

For testing our database lest just use the postgresql client, we could install it with : 

{% highlight bash %}
sudo apt-get install postgresql-client  
{% endhighlight %}

We will login in our server with our moviesdba user so we need to get it password, we could get it with:

{% highlight bash %}
$ microk8s.kubectl get secret moviesdba.movies-db-cluster.credentials -o 'jsonpath={.data.password}' | base64 -d 
9oYUFcamSKwjB5Yrg099glLHdqg8C1IkScRfd5TeHTisiuj23FQrx3YEW6fB3ctJ
{% endhighlight %}

The operator has configured our database server to only be accessed within the cluster so in order to test it 
we will forward the postgres port 5432 on our master to our localhost port 6432, this will run until we do *ctrl+c* :

{% highlight bash %}
$ microk8s.kubectl port-forward movies-db-cluster-0 6432:5432                        
Forwarding from 127.0.0.1:6432 -> 5432
Forwarding from [::1]:6432 -> 5432
{% endhighlight %}

Finally we can connect to our database with with the provide user and password using psql in another
shell :

{% highlight bash %}
$ psql -h localhost -p 6432 -U moviesdba movies                                                            
Password for user moviesdba: 
psql (11.6 (Ubuntu 11.6-1.pgdg18.04+1), server 11.5 (Ubuntu 11.5-1.pgdg18.04+1))
SSL connection (protocol: TLSv1.3, cipher: TLS_AES_256_GCM_SHA384, bits: 256, compression: off)
Type "help" for help.

movies=# \list
                                  List of databases
   Name    |   Owner   | Encoding |   Collate   |    Ctype    |   Access privileges   
-----------+-----------+----------+-------------+-------------+-----------------------
 movies    | moviesdba | UTF8     | en_US.UTF-8 | en_US.UTF-8 | 
 postgres  | postgres  | UTF8     | en_US.UTF-8 | en_US.UTF-8 | 
 template0 | postgres  | UTF8     | en_US.UTF-8 | en_US.UTF-8 | =c/postgres          +
           |           |          |             |             | postgres=CTc/postgres
 template1 | postgres  | UTF8     | en_US.UTF-8 | en_US.UTF-8 | =c/postgres          +
           |           |          |             |             | postgres=CTc/postgres
(4 rows)

movies=# \du
                                          List of roles
 Role name  |                         Attributes                         |       Member of        
------------+------------------------------------------------------------+------------------------
 admin      | Create DB, Cannot login                                    | {moviesdba,moviesuser}
 moviesdba  | Superuser, Create DB                                       | {}
 moviesuser |                                                            | {}
 postgres   | Superuser, Create role, Create DB, Replication, Bypass RLS | {}
 robot_zmon | Cannot login                                               | {}
 standby    | Replication                                                | {}
 zalandos   | Create DB, Cannot login                                    | {}

movies=# \q
{% endhighlight %}

We have verify that our users are setup in our database, now we are ready for more steps that I'll try to cover
in the following days creating an application that run on our k8s cluster and connect to our database.

Finally if we look to look more about how this operator works, how we could scale our replicas and repair our 
database we should take a look to the operator [documentation](https://postgres-operator.readthedocs.io/en/latest/#overview-of-involved-entities){:target="_blank"}.

**References**

- [https://github.com/zalando/postgres-operator/blob/master/docs/quickstart.md](https://github.com/zalando/postgres-operator/blob/master/docs/quickstart.md){:target="_blank"}
- [https://github.com/ubuntu/microk8s/issues/695](https://github.com/ubuntu/microk8s/issues/695){:target="_blank"}
- [https://grouplens.org/datasets/movielens/](https://grouplens.org/datasets/movielens/){:target="_blank"}
- [https://github.com/helm/helm/issues/6359](https://github.com/helm/helm/issues/6359){:target="_blank"}
- [https://webcloudpower.com/use-kubernetics-locally-with-microk8s/](https://webcloudpower.com/use-kubernetics-locally-with-microk8s/){:target="_blank"}
- [https://postgres-operator.readthedocs.io](https://postgres-operator.readthedocs.io){:target="_blank"}

