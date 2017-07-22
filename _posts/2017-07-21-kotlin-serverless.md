---
layout: post
title: Serverless Kotlin
date: 2017-07-21 21:00:00
author: Juan Medina
comments: true
categories: [Programming]
image: /assets/img/openwhiskkotlin.png
image-sm: /assets/img/openwhiskkotlin.png
---

Right now there is a lot of traction on the Serverless architecture so I decide to give a try and do some examples using Kotlin.

The full source of this post it's available in this [repository](https://github.com/LearningByExample/KotlinServerless){:target="_blank"}.

First I recommend to read this [article](https://martinfowler.com/articles/serverless.html){:target="_blank"} by [Mike Roberts](https://twitter.com/mikebroberts){:target="_blank"} from Martin Fowler website to get a bit more understanding on what is a Serverless architecture.

Them we should take a loot to the [System Overview](https://github.com/apache/incubator-openwhisk/blob/master/docs/about.md){:target="_blank"} of [Apache Openwhisk](http://openwhisk.incubator.apache.org/){:target="_blank"}.

So now let starting to preparing our platform, we will require [Vagrant](http://vagrantup.com/){:target="_blank"} and [Virtual Box](https://www.virtualbox.org/wiki/Downloads){:target="_blank"}, so install those first.

{% highlight shell %}
  $ git clone --depth=1 https://github.com/apache/incubator-openwhisk.git openwhisk
  $ cd openwhisk/tools/vagrant
  $ ./hello
{% endhighlight %}

This will take a considerable amount of time so wait until everything is completed.

Now to test that the installation work we could just:

{% highlight shell %}
  $ vagrant ssh -- wsk action invoke /whisk.system/utils/echo -p message hello --result
{% endhighlight %}

This will output:

{% highlight json %}
  {
      "message": "hello"
  }
{% endhighlight %}

Now we could stop our Whisk server anytime with:

{% highlight shell %}
  $ vagrant suspend
{% endhighlight %}

And bring it back with:
{% highlight shell %}
  $ vagrant up
{% endhighlight %}

Now let's create a simple Kotlin function:

{% highlight Kotlin %}
  fun fibonacci(numbers: Long): Array<Long> {
    if (numbers == 0L) return arrayOf(0L)
    if (numbers == 1L) return arrayOf(1L)

    var previous = 1L
    var current = 1L
    var temp: Long

    return arrayOf(1L, 1L) + (1..(numbers - 2)).map {
      temp = current + previous
      previous = current
      current = temp
      current
    }.toList().toTypedArray()
  }
{% endhighlight %}

This function just calculate a set of Fibonacci numbers, let try it out:

{% highlight Kotlin %}
  fun main(args: Array<String>) = fibonacci(5).forEach(::println)
{% endhighlight %}

This should output:

{% highlight Kotlin %}
  1
  1
  2
  3
  5
{% endhighlight %}

But how we could convert this into a Serverless function?

First we need to create a main function as OpenWhisk will be able to understand :

{% highlight Kotlin %}
  fun main(args: JsonObject) : JsonObject {

  }
{% endhighlight %}

OpenWhisk use [Google GSon](https://github.com/google/gson){:target="_blank"} so we will use in the final project maven to package our jar with dependencies, but for now let's concentrate in the code, but the pom could be see [here](https://github.com/LearningByExample/KotlinServerless/blob/master/pom.xml){:target="_blank"}.

OpenWhisk will sent to our function as many parameters as we define when we create our function, so for this I'll need a parameters called _numbers_.

We could get the value with a simple extension function:

{% highlight Kotlin %}
  fun JsonObject.paramOrElse(name: String, elseValue: Long): Long = if (this.has(name))
    this.getAsJsonPrimitive(name).asLong else elseValue
{% endhighlight %}

 So now in our main function we could do something like :

{% highlight Kotlin %}
  fun main(args: JsonObject) : JsonObject {
    val numbers = args.paramOrElse("numbers", 10L)
    val results = fibonacci(numbers)
  }
{% endhighlight %}

All so now we need to get a result so we could do something like:

{% highlight Kotlin %}
  fun main(args: JsonObject) : JsonObject {
    val numbers = args.paramOrElse("numbers", 10L)
    val results = fibonacci(numbers)
    val response = JsonObject()
    val elements = JsonArray()
    results.forEach{ elements.add(it) }
    response.add("result", elements)
    return response
  }
{% endhighlight %}

This look OK but I think we could improve adding just one extension function:

{% highlight Kotlin %}
  fun Long.throughFunction(operation: (Long) -> Array<Long>): JsonObject {
    val result = JsonObject()
    val elements = JsonArray()
    operation(this).forEach(elements::add)
    result.add("result", elements)
    return result
  }
{% endhighlight %}

With this our main could become just:

{% highlight Kotlin %}
  fun main(args: JsonObject) = args.paramOrElse("numbers", 10L).throughFunction(::fibonacci)
{% endhighlight %}

Let put all the parts together :

{% highlight Kotlin %}
  package org.learning.by.example.serverless.kotlin

  import com.google.gson.JsonArray
  import com.google.gson.JsonObject

  fun fibonacci(numbers: Long): Array<Long> {
    if (numbers == 0L) return arrayOf(0L)
    if (numbers == 1L) return arrayOf(1L)

    var previous = 1L
    var current = 1L
    var temp: Long

    return arrayOf(1L, 1L) + (1..(numbers - 2)).map {
      temp = current + previous
      previous = current
      current = temp
      current
    }.toList().toTypedArray()
  }

  fun JsonObject.paramOrElse(name: String, elseValue: Long): Long = if (this.has(name))
    this.getAsJsonPrimitive(name).asLong else elseValue

  fun Long.throughFunction(operation: (Long) -> Array<Long>): JsonObject {
    val result = JsonObject()
    val elements = JsonArray()
    operation(this).forEach(elements::add)
    result.add("result", elements)
    return result
  }

  fun main(args: JsonObject) = args.paramOrElse("numbers", 10L).throughFunction(::fibonacci)
{% endhighlight %}

With this prototype we could create many functions, in fact with a couple of generics could get even better but let's do that another day.

So now we need to compile our function, since latter we will use vagrant is better that we put our project in the OpenWhisk folder created at the beginning of the post
since it will be map into the OpenWhisk machine.

I've create mine under openwhisk/projects/KotlinServerless and I'll use maven wrapper

{% highlight shell %}
  $ cd openwhisk
  $ cd projects/KotlinServerless
  $ mvnw package
{% endhighlight %}

Now get back into the vagrant directory and ssh into the OpenWhisk machine:

{% highlight shell %}
  $ cd openwhisk
  $ cd tools/vagrant
  $ vagrant ssh
{% endhighlight %}

Now from the OpenWhisk machine we will get into our function directory:

{% highlight shell %}
  $ cd openwhisk/projects/KotlinServerless/target
  $ wsk action create Fibonacci KotlinServerless-1.0-SNAPSHOT-jar-with-dependencies.jar --main \
  org.learning.by.example.serverless.kotlin.FibonacciKt

  ok: created action Fibonacci
{% endhighlight %}

We need to specify the full location of our class, and remember than an static method in Kotlin get created in a class named _FileName_Kt.class

Now let's run our function:

{% highlight shell %}
  $ wsk action invoke --result Fibonacci --param numbers 5
{% endhighlight %}

And we will get as output something like:

{% highlight json %}
  {
      "result": [
          1,
          1,
          2,
          3,
          5
      ]
  }
{% endhighlight %}

And of course we could running without parameters as:

{% highlight shell %}
  $ wsk action invoke --result Fibonacci
{% endhighlight %}

And the result will be:

{% highlight json %}
  {
      "result": [
          1,
          1,
          2,
          3,
          5,
          8,
          13,
          21,
          34,
          55
      ]
  }
{% endhighlight %}

Finally don't forget to suspend the vagrant machine after your done for the day, if not the OpenWhisk server sometimes get in bad state.

{% highlight shell %}
  $ vagrant suspend
{% endhighlight %}

You could get it back simply with:
{% highlight shell %}
  $ vagrant up
{% endhighlight %}

I think this is enough for today, let's see what else we do another day with this interesting topic.
