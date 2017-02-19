---
layout: post
title: OpenShift
date: 2015-10-17 19:40
author: latok
comments: true
categories: [Programming]
image: /assets/img/rh_openshift_logo_rgb_black.png
image-sm: /assets/img/rh_openshift_logo_rgb_black.png
---
There is a lot of movement in the [PaaS](https://en.wikipedia.org/wiki/Platform_as_a_service){:target="_blank"} world, many companies are trying to showcase what is the best platform and to be honest I don't really know.

However I decided to try it out and I've choose [Red Hat OpenShift](https://www.openshift.com){:target="_blank"}.

Red Hat has done with OpenShift a great work, and any one could try it out with their free accounts.

I've redo my [MEAN example](https://github.com/cecile/meanexample) that I original create to run in [AWS example](https://aws.amazon.com).

The results could be seen [here](http://node-juanmedina.rhcloud.com), and the code is available in this [github repository](https://github.com/cecile/openshift), the code includes a guide to clone this and get just a instance running of the same code.

These are the step that I've follow to get this done:

- Create an account in OpenShift
- Download the client tools as is described in [this guide](https://developers.openshift.com/en/getting-started-overview.html), as prerequisite you need [Git](https://git-scm.com/) and [Ruby](https://www.ruby-lang.org/)
- Create a folder and then set-up the tool

{% highlight shell %}
$ rhc setup
{% endhighlight %}

The set-up will create the domain for the apps and it will create &amp; store a SSH certificate that identify the account.

- Create an application, it could be done as part of the set-up as well. I've choose NodeJS and MongoDB cartridge

{% highlight shell %}
$ rhc app create <app name> nodejs-0.10 mongodb-2.4
{% endhighlight %}

- Edit *package.json* to edit the modules, I've add *mongoose* and *bower*, *express* was already there.
- Modify server.js code to connect to mongo using mongoose. They are environment variables already defined as its a cartridge in the app:
{% highlight shell %}
$OPENSHIFT_MONGODB_DB_HOST
$OPENSHIFT_MONGODB_DB_PORT
$OPENSHIFT_MONGODB_DB_USERNAME
$OPENSHIFT_MONGODB_DB_PASSWORD
{% endhighlight %}

- Add your front side scripts dependencies using *bower.json*, like *AngularJS*.
- I've add and extra script step in package.json to launch bower when the app its build.

{% highlight json %}
{
"postinstall": "HOME=$OPENSHIFT_REPO_DIR bower install || bower install"
}
{% endhighlight %}

- Now to build the app.

{% highlight shell %}
$ git add
$ git commit
$ git push origin master
{% endhighlight %}

If something went wrong we could view our logs, to access them:

{% highlight shell %}
$ rhc ssh
$ cd $OPENSHIFT_LOG_DIR
$ tail/vi/cat.....
{% endhighlight %}

Or use
{% highlight shell %}
$ rhc tail -a <app name>
{% endhighlight %}

Each time that we do a *push* the application will be sent to OpenShift and build, including update bower scripts. Them in OpenShift we could any time switch between builds in the Git repository or scale our app automatically.

We could choose to instead to do the bower step when we build, to do it in local and them upload to the repository the scripts dependencies, but the idea of a PaaS is that this is a standalone self contained app and it could be rebuild any time anywhere.

Additional we could add our own repository, as github just adding another remote:
{% highlight shell %}
$ git remote add github <git hub repo url>
{% endhighlight %}

So we could push to github whenever we like to:
{% highlight shell %}
$ git push github master
{% endhighlight %}

Two prepare a local environment that we could use to build and test our app before sent to OpenShift we need to do some additional steps:
- Download and install NodeJS and MongoDB.
- Since we are going to build locally add .gitnore to *node_module* and *bower_components* folders so we don't upload them to OpenShift.
- Configure MongoDB, including creating users and run the server.
- Set-up enviroment variables as the ones in OpenShift
{% highlight shell %}
$OPENSHIFT_NODEJS_IP
$OPENSHIFT_NODEJS_PORT
$OPENSHIFT_MONGODB_DB_HOST
$OPENSHIFT_MONGODB_DB_PORT
$OPENSHIFT_MONGODB_DB_USERNAME
$OPENSHIFT_MONGODB_DB_PASSWORD
{% endhighlight %}

Now we could build and run locally using

{% highlight shell %}
$ npm install
$ npm start
{% endhighlight %}

And that is the basic idea.

As I said I really like how OpenShift works and I'm looking forward to do more test with it.
