---
layout: post
title: Native Serverless Kotlin
date: 2017-07-30 08:00:00
author: Juan Medina
comments: true
categories: [Programming]
image: /assets/img/kotlin_native.png
image-sm: /assets/img/kotlin_native.png
---

Last week we do an [example](https://juan-medina.com/2017/07/21/kotlin-serverless/){:target="_blank"} of a Kotlin Serverless Function using Apache OpenWhisk, however since we using Kotlin we could make our example a native application that will not run in the JVM.

You could find this complete example in [this repository](https://github.com/LearningByExample/KotlinNativeServerless){:target="_blank"}.

We will need as the week before to have OpenWhisk, and we will require again [Vagrant](http://vagrantup.com/){:target="_blank"} and [Virtual Box](https://www.virtualbox.org/wiki/Downloads){:target="_blank"}, so install those first.

To setup the environment just:

{% highlight shell %}
  $ git clone --depth=1 https://github.com/apache/incubator-openwhisk.git openwhisk
  $ cd openwhisk/tools/vagrant
  $ ./hello
{% endhighlight %}

Now we could ssh to the machine with:

{% highlight shell %}
  $ vagrant ssh
{% endhighlight %}

To test the action directly just using the docker that I've upload to [docker hub](https://hub.docker.com/r/jamedina/kotlin-native-fibonacci/){:target="_blank"}:

{% highlight shell %}
  $ wsk action create native-fibonacci --docker jamedina/kotlin-native-fibonacci
{% endhighlight %}

To test the new action just run:

{% highlight shell %}
  $ wsk action invoke --result native-fibonacci --param numbers 5
{% endhighlight %}

This will output something like:

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

OpenWhisk allow us to use a docker that contain a binary that will be execute when an action is invoke, to do it so the binary will receive 1 argument with a JSON string and it need to return a JSON string in a single line.

So to create our function first we need to have [kotlin-native](https://github.com/JetBrains/kotlin-native){:target="_blank"} installed and configured:
{% highlight shell %}
  $ git clone --depth 1 https://github.com/JetBrains/kotlin-native.git /kotlin-native
  $ cd /kotlin-native
  $ ./gradlew dependencies:update
  $ ./gradlew dist
  $ export PATH="/kotlin-native/dist/bin:$PATH"
  $ kotlinc
{% endhighlight %}

The last line will raise and error since we haven provide any parameters to the compiler but we just do that in order to download the compiler dependencies and toolchain.

Now we will create our project, kotlin native use a gradle plugin that we initial setup as:

{% highlight gradle %}
  buildscript {
      repositories {
          mavenCentral()
          maven {
              url "https://dl.bintray.com/jetbrains/kotlin-native-dependencies"
          }
      }

      dependencies {
          classpath "org.jetbrains.kotlin:kotlin-native-gradle-plugin:+"
      }
  }

  apply plugin: 'konan'

  konanArtifacts {
      fibonacci {
      }
  }
{% endhighlight %}

We need as well to specify where is kotlin-native installed using the gradle.properties:

{% highlight ini %}
  konan.home=/kotlin-native/dist
{% endhighlight %}

now lets just create one simple main in the folder src/main.kt

{% highlight kotlin %}
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

  fun main(args: Array<String>) = fibonacci(5).forEach(::println)
{% endhighlight %}

Now to compile simple :
{% highlight shell %}
  $ gradlew clean build
{% endhighlight %}

We use clean because sometimes gradle will not compile the files even with the files changed.

Then we could run it with:
{% highlight shell %}
  $ ./build/konan/bin/fibonacci.kexe
  1
  1
  2
  3
  5
{% endhighlight %}

Now we need to use JSON but since we don't have the JVM neither we could use any Java code we are just going to use a C JSON library, I'm choose [parson](https://github.com/kgabis/parson){:target="_blank"} since is perfect for the task.

First clone it, or create a submodule in your git:

{% highlight shell %}
  $ mkdir src/cpp
  $ cd src/cpp
  $ git clone --depth 1 https://github.com/kgabis/parson.git
{% endhighlight %}

No I've create a shell script to compile the C code into a library that we could latter link:

{% highlight bash %}
  DEPS=$(dirname `type -p konanc`)/../dependencies

  if [ x$TARGET == x ]; then
  case "$OSTYPE" in
    darwin*)  TARGET=macbook ;;
    linux*)   TARGET=linux ;;
    *)        echo "unknown: $OSTYPE" && exit 1;;
  esac
  fi

  CLANG_linux=$DEPS/clang-llvm-3.9.0-linux-x86-64/bin/clang++
  CLANG_macbook=$DEPS/clang-llvm-3.9.0-darwin-macos/bin/clang++

  var=CLANG_${TARGET}
  CLANG=${!var}

  mkdir -p build/clang/

  $CLANG -x c -c src/main/cpp/parson/parson.c -o build/clang/parson.bc -emit-llvm || exit 1
{% endhighlight %}

This script will create a library in [LLVM](https://llvm.org/){:target="_blank"} format, the architecture used by Kotlin Native.

Now we need to update our gradle script to compile the C code, and to link it to our program.

{% highlight gradle %}
  buildscript {
      repositories {
          mavenCentral()
          maven {
              url "https://dl.bintray.com/jetbrains/kotlin-native-dependencies"
          }
      }

      dependencies {
          classpath "org.jetbrains.kotlin:kotlin-native-gradle-plugin:+"
      }
  }

  apply plugin: 'konan'

  konanInterop {
      Parson {
          includeDirs "${project.projectDir}/src/main/cpp/parson"
      }
  }

  konanArtifacts {
      fibonacci {
          useInterop "Parson"
          nativeLibrary "${project.buildDir.canonicalPath}/clang/parson.bc"
      }
  }

  task compileCpp(type: Exec) {
      dependsOn 'genParsonInteropStubs'
      workingDir project.getProjectDir()
      commandLine './buildCpp.sh'
  }

  compileKonanFibonacci {
      dependsOn 'compileCpp'
  }

{% endhighlight %}

Finally, we need to add a definition file for the C code so Kotlin could create and stub for it.

The file should be place in src/c_interop/Parson.def :
{% highlight ini %}
  headers = parson.h
  headerFilter = parson.h
{% endhighlight %}

Now we could just build as before to check that everything is ok:

{% highlight shell %}
  $ gradlew clean build
{% endhighlight %}

This should generate some files including:

  - build/clang/parson.bc : The library that could be linked.
  - build/konan/interopStubs/genParsonInteropStubs/Parson/Parson.kt : The Kotin Stub for calling the library.

No we modify our program to use parson:

{% highlight shell %}
  import kotlinx.cinterop.*
  import Parson.*

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

  fun Array<String>.paramOrElse(name: String, elseValue: Long): Long {
    var result = elseValue
    if (this.size > 0) {
      val json = this[0]
      memScoped {
        val schema = json_parse_string(json)
        if (schema != null) {
          val root = json_object(schema)
          if (root != null) {
            if (json_object_has_value(root, name) == 1) {
              result = json_object_get_number(root, name).toLong()
            }
          }
          json_value_free(schema)
        }
      }
    }
    return result
  }

  fun Long.throughFunction(operation: (Long) -> Array<Long>): String {
    var result = "{}"
    val elements = operation(this)
    memScoped {
      val schema = json_value_init_object()
      val root = json_value_get_object(schema)

      json_object_set_value(root, "result", json_value_init_array())
      val array = json_object_get_array(root, "result");

      elements.forEach {
        json_array_append_number(array, it.toDouble())
      }

      result = json_serialize_to_string(schema)?.toKString()!!
      json_value_free(schema)
    }
    return result
  }

  fun main(args: Array<String>) {

    val result = args.paramOrElse("numbers", 10L).throughFunction(::fibonacci)

    println(result)
  }

{% endhighlight %}

We have create a couple of functions that uses the Kotlin/Native [interoperability](https://github.com/JetBrains/kotlin-native/blob/master/INTEROP.md){:target="_blank"} so we could invoke Parson.

After building the program again we could just use it like this:

{% highlight shell %}
  $ ./build/konan/bin/Fibonacci.kexe "{ \"numbers\" : 5 }"
  {"result":[1,1,2,3,5]}
{% endhighlight %}

No we need to create a docker for it, OpenWhisk have a docker base image that is based on alpine linux, I've not been able to make Kotlin-Native to work on alpine so I've create a base [docker image](https://hub.docker.com/r/jamedina/openwhisk-kotlin-native/){:target="_blank"} that any one could use for making Kotlin Native Serverless functions.

The docker file for that image is:

{% highlight dockerfile %}
  # Dockerfile for runing a openwishk Kotlin native action
  FROM openjdk:8-jdk

  #install kotlin native
  RUN git clone --depth 1 https://github.com/JetBrains/kotlin-native.git
  WORKDIR kotlin-native
  RUN ./gradlew dependencies:update
  RUN ./gradlew dist

  ENV PATH /kotlin-native/dist/bin:$PATH

  #install python
  RUN apt-get update
  RUN apt-get install python3-setuptools -y
  RUN easy_install3 pip
  RUN pip3 install --upgrade pip setuptools six
  RUN pip3 install --no-cache-dir gevent==1.2.1 flask==0.12

  #install c libraries
  RUN apt-get update
  RUN apt-get install libc-dev -y

  #preparing the action proxy
  ADD actionProxy/ /actionProxy
  WORKDIR /actionProxy
  ENV FLASK_PROXY_PORT 8080

  CMD ["/bin/bash"]
{% endhighlight %}

I've use openjdk 8 since we are going to use gradle in our build and it use the actionProxy python3 script that is provide by OpenWhisk to create a flask server that will serve our action trough HTTP, our action should be place in the folder /action and be named exec.

So now we could create a docker image for our fibonacci function:

{% highlight dockerfile %}
  # Dockerfile for runing a Kotlin native fibonacci action
  FROM jamedina/openwhisk-kotlin-native

  #add basic gradle files
  ADD .gradle/ /temp-build/.gradle
  ADD gradle/ /temp-build/gradle
  ADD build.gradle /temp-build
  ADD gradlew /temp-build
  ADD gradle.properties /temp-build

  #get the compiler
  WORKDIR /temp-build
  RUN ./gradlew

  # add our action code
  ADD src/ /temp-build/src
  ADD buildCpp.sh /temp-build

  #build our action
  RUN ./gradlew build

  #copy the action as the default OpenWhisk docker actions
  RUN mkdir /action
  RUN cp /temp-build/build/konan/bin/fibonacci.kexe /action/exec

  #clean up
  RUN rm -rf /temp-build
  RUN rm -rf /kotlin-native

  CMD ["/bin/bash", "-c", "cd /actionProxy && python3 -u actionproxy.py"]

{% endhighlight %}

Finally, I create a simple scripts to publish the images in docker hub, remember to login before.

{% highlight bash %}
  #!/usr/bin/env bash
  echo "creating base image jamedina/openwhisk-kotlin-native"
  docker build -t jamedina/openwhisk-kotlin-native docker/

  if [ "$?" -eq "0" ]
  then
    echo "pushing jamedina/openwhisk-kotlin-native"
    docker push jamedina/openwhisk-kotlin-native
    if [ "$?" -eq "0" ]
    then
      echo "creating image jamedina/kotlin-native-fibonacci"
      docker build -t jamedina/kotlin-native-fibonacci .
      if [ "$?" -eq "0" ]
      then
        echo "pushing"
        docker push jamedina/kotlin-native-fibonacci
        if [ "$?" -eq "0" ]
        then
          echo "done"
        else
          echo "fail to push fibonacci docker"
        fi
      else
        echo "fail to build fibonacci docker"
      fi
    else
      echo "fail to push base docker"
    fi
  else
    echo "fail to build base docker"
  fi

{% endhighlight %}

In the way that the files are added to the docker we can just run that command to get update the image only doing the parts that actually change.

So now we could put all things together to do:

{% highlight shell %}
  $ ./build.sh
  $ wsk action create native-fibonacci --docker jamedina/kotlin-native-fibonacci
  $ wsk action invoke --result native-fibonacci --param numbers 5
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

This has been a great example to learn Kotlin Native, so sure I'll do more things with it in a future.

_Note: Many things could be change in this example, for example I could create a builder image that generate the binary and use for creating another image that has only that binary, since we do not need the whole compiler infrastructure and the image could be much smaller, but for demonstration is just OK._
