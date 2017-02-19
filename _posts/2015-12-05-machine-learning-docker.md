---
layout: post
title: Machine Learning Rest API in a Docker
date: 2015-12-05 16:19
author: latok
comments: true
categories: [Programming]
image: /assets/img/docker.png
image-sm: /assets/img/docker.png
---
I've been trying to learn how to create and use docker and I thought that could be a nice idea to create a machine learning docker as a starting example to have something running.

But instead to use a existing docker image for machine learning I've try to create from scratch a full functional image that provide REST API machine learning services.

But in any case the full sourced of this is available in this git:

[https://github.com/cecile/docker-ml-api](https://github.com/cecile/docker-ml-api){:target="_blank"}

or download from Docker hub:
{% highlight shell %}
$ docker pull jamedina/ml-api
{% endhighlight %}

Before starting its worth mentioning that going through [getting started with docker](https://docs.docker.com/mac/started/){:target="_blank"} is a excellent starting point for understanding many of the docker topics and will give you the tools required.

First lets create a new folder for our docker image an the Dockerfile:
{% highlight shell %}
$ mkdir ml-api
$ cd ml-api
$ touch Dockerfile
{% endhighlight %}

Now we add the initial lines to our docker file:
{% highlight dockerfile %}
FROM ubuntu:14.04
MAINTAINER Juan Medina <jamedina@gmail.com>
ENV DEBIAN_FRONTEND noninteractive
{% endhighlight %}

Lets build our docker, initial build will take a while:
{% highlight shell %}
$ docker build -t ml-api .
{% endhighlight %}

And them run the docker in iterative way since there is nothing there yet.

{% highlight shell %}
$ docker run -i ml-api
{% endhighlight %}

In the iterative shell we could just try to list files and exit:

{% highlight shell %}
$ ls
$ exit
{% endhighlight %}

Lets add now python and pip to the docker image adding to the Dockerfile:

{% highlight dockerfile %}
RUN apt-get update
RUN apt-get -y install python-pip python-dev

CMD ["/usr/bin/python","--version"]
{% endhighlight %}

Now we could just rebuild and run:

{% highlight shell %}
$ docker build -t ml-api .
$ docker run ml-api
{% endhighlight %}

Something like this will be output:
{% highlight shell %}
Python 2.7.6
{% endhighlight %}

Now lets create a folder for our python app:
{% highlight shell %}
$ mkdir python-app
{% endhighlight %}

Lets create a small test python program in /python-app/test.py:

{% highlight python %}
if __name__ == '__main__':
    print("hello from a python docker")
{% endhighlight %}

Modify the Dockerfile to call our python program:
{% highlight shell %}
FROM ubuntu:14.04
MAINTAINER Juan Medina <jamedina@gmail.com>
ENV DEBIAN_FRONTEND noninteractive
RUN apt-get update
RUN apt-get -y install python-pip python-dev
copy python-app /var/python-app
CMD ["/usr/bin/python","/var/python-app/test.py"]
{% endhighlight %}

Rebuild and run the docker will produce:
{% highlight shell %}
hello from a python docker
{% endhighlight %}

Sometimes we like to clean our docker system, if we do this we could see the containers:
{% highlight shell %}
$ docker ps -a
{% endhighlight %}

To stop and remove our containers we could do:
{% highlight shell %}
$ docker stop `docker ps -qa`
$ docker rm `docker ps -qa`
{% endhighlight %}

Now we are going to change our python installation to be a machine learning installation, edit the Dockerfile and change the apt-install to be:
{% highlight shell %}
RUN apt-get -y install python-pip python-numpy python-scipy python-matplotlib ipython ipython-notebook python-pandas python-sympy python-nose python-sklearn python-nltk
{% endhighlight %}

Now we could modify our test program /python-app/test.py:

{% highlight python %}
from nltk import word_tokenize
if __name__ == '__main__':
    s = "hello from a python docker, now with tokens using nltk"
    t = word_tokenize(s)
    print(t)
{% endhighlight %}

And this will be the output:
{% highlight python %}
['hello', 'from', 'a', 'python', 'docker', ',', 'now', 'with', 'tokens', 'using', 'nltk']
{% endhighlight %}

Is time to do a simple sentiment analysis using TextBlob
Now we are going to create a folder for our configuration:

{% highlight shell %}
$ mkdir cfg
{% endhighlight %}

We will add this file for set python dependencies in /cfg/python-deps.txt
{% highlight shell %}
textblob
{% endhighlight %}



We are going to modify the Dockerfile to copy the config, and invoke pip to install dependencies, them we will download the corpus data for TextBlob:
{% highlight shell %}
FROM ubuntu:14.04

MAINTAINER Juan Medina <jamedina@gmail.com>

ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update
RUN apt-get -y install python-pip python-numpy python-scipy python-matplotlib ipython ipython-notebook python-pandas python-sympy python-nose python-sklearn python-nltk

copy python-app /var/python-app
copy cfg /etc/cfg

RUN pip install -r /etc/cfg/python-deps.txt
RUN python -m textblob.download_corpora

CMD ["/usr/bin/python","/var/python-app/test.py"]
{% endhighlight %}

So lets add some sentiment analysis to our test program:
{% highlight python %}
from textblob import TextBlob
if __name__ == '__main__':
    s = "Python is great"
    b = TextBlob(s)
    print(b.sentiment)
{% endhighlight %}

This will be the output:
{% highlight python %}
Sentiment(polarity=0.8, subjectivity=0.75)
{% endhighlight %}

Now lets configure the flask web app.

First add to /cfg/python-deps.txt:
{% highlight shell %}
flask
{% endhighlight %}

Modify Dockerfile to export a port and set and environment variable:
{% highlight shell %}
FROM ubuntu:14.04
MAINTAINER Juan Medina <jamedina@gmail.com>

ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update
RUN apt-get -y install python-pip python-numpy python-scipy python-matplotlib ipython ipython-notebook python-pandas python-sympy python-nose python-sklearn python-nltk

copy python-app /var/python-app

copy cfg /etc/cfg

RUN pip install -r /etc/cfg/python-deps.txt
RUN python -m textblob.download_corpora

ENV FLASK_PORT 8080

EXPOSE $FLASK_PORT

CMD ["/usr/bin/python","/var/python-app/flask-web.py"]
{% endhighlight %}

And finally lets sketch a simple test service in python-app/flask-web.py:
{% highlight python %}
import os
from flask import Flask
from flask import jsonify

app = Flask(__name__)

@app.route('/api/test')
def test():
    return jsonify(result = "ok")

if __name__ == '__main__':
    port = os.environ['FLASK_PORT']
    ;app.run(host='0.0.0.0',port=int(port))
{% endhighlight %}

Now to run our docker in daemon and map the expose port to port 80:
{% highlight shell %}
$ docker run -d -p 80:8080 ml-api
{% endhighlight %}

Remember that the docker could be stop with:
{% highlight shell %}
$ docker stop [container]</code>
{% endhighlight %}
We need to know the IP of our container, if we are using docker machine and we haven't change the default VM we could use:
{% highlight shell %}
$ docker-machine ip default
{% endhighlight %}

Them we could test using the url : http://IP/api/test

We should see this:
{% highlight json %}
{
  "result": "ok"
}
{% endhighlight %}

And we could see the log using :
{% highlight shell %}
$ docker logs [container]
{% endhighlight %}

This should output
{% highlight shell %}
* Running on http://0.0.0.0:8080/ (Press CTRL+C to quit)
192.168.99.1 - - [05/Dec/2015 12:05:11] "GET /api/test HTTP/1.1" 200 -
{% endhighlight %}

Now lets create a basic REST service that return the sentiment from an string, we will add some basic error handling to our flask service, just edit /python-app/flask-web.py:
{% highlight python %}
import sys
import os
import logging
from flask import Flask
from flask import jsonify
from flask import request
from textblob import TextBlob

app = Flask(__name__)

@app.route('/api/sentiment/query',methods=['POST','GET'])
def query_sentiment():

    try:
        req_json = request.get_json()

            if req_json is None:

                return jsonify( error = 'this service require A JSON request' )

            else:
                if not ('text' in req_json):
                    raise Exception('Missing mandatory paramater "text"')

            text = req_json['text']
            blob = TextBlob(text)
            sentiment = blob.sentiment

            return jsonify(polarity = sentiment.polarity, subjectivity = sentiment.subjectivity)

    except Exception as ex:
       app.log.error(type(ex))
       app.log.error(ex.args)
       app.log.error(ex)
       return jsonify(error = str(ex))

if __name__ == '__main__':

    LOG_FORMAT = "'%(asctime)s - %(name)s - %(levelname)s - %(message)s'"
    logging.basicConfig(level=logging.DEBUG,format=LOG_FORMAT)
    app.log = logging.getLogger(__name__)

    port = os.environ['FLASK_PORT']
    app.run(host='0.0.0.0',port=int(port),debug=False)</code>
{% endhighlight %}

Them we could test our service:

![output](/assets/img/ml_rest_output.png)
