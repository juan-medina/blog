---
layout: post
title: Why we should use functional programming?
date: 2017-05-11 18:54:00
author: Juan Medina
comments: true
categories: [Programming]
image: /assets/img/Functional-Prog.png
image-sm: /assets/img/Functional-Prog.png
---
In the past days I've been focusing on learning reactive programming with Spring 5 and while reviewing the [example microservice](https://github.com/LearningByExample/reactive-ms-example){:target="_blank"}  that we create with some friends, we realize how much functional programming we use and how our coding has change since them.

Everyone, in a way or another, understand what functional programming is, we could read the syntax, we could write many lambdas, but the big question is "why?".

I don't want to get into enumeration of qualities or get in the usual dogmatic approach about it, this is about code.

Coding is not just syntax, is how we use it to solve problems. I like to show with code how functional programming could help in new ways, at that is what I like to care right now.

All the code posted here is available in [this git repo](https://github.com/LearningByExample/WhyFunctional){:target="_blank"} and you could follow the tests incrementally to understand this concepts.

To simplify the code I'll not use streams, just basically plain Java 8.

Let's create 3 simple Java methods

{% highlight java %}
  private String name() {
      return "functional";
  }

  private String reverse(final String value) {
      return new StringBuffer(value).reverse().toString();
  }

  private void print(final Object value) {
      System.out.println(value.toString());
  }
{% endhighlight %}

Is clear what they do, and we could use it like this:

{% highlight java %}
  print(reverse(name()));
{% endhighlight %}

We know how this work because we have learn that the most interior method, name, is execute first and print last.
But of course no one programming things like this, most likely most people will change it to really reflect what we trying to do:
{% highlight java %}
  final String name = name();
  final String reverseName = reverse(name);
  print(reverseName);
{% endhighlight %}

We could just convert those functions to functional method using the Java 8 functions:
{% highlight java %}
  private Supplier<String> name() {
      return () -> "functional";
  }

  private Function<String,String> reverse() {
      return value -> new StringBuffer(value).reverse().toString();
  }

  private Consumer<String> print() {
      return value -> System.out.println(value);
  }
{% endhighlight %}

The our prints could be just:
{% highlight java %}
  print().accept(reverse().apply(name().get()));
{% endhighlight %}

Or most likely:
{% highlight java %}
  final String name = name().get();
  final String reverseName = reverse().apply(name);
  print().accept(reverseName);
{% endhighlight %}

Seriously we don't see many benefit to use functional interfaces there, just for the sake of use them. That syntax is correct, it uses functional interfaces, but by far is not something that we use to solve problems.

But wait here, we will get there eventually, now just check this class.

{% highlight java %}
  static class Wrapper {
      private final String value;

      private Wrapper(final String value) {
          this.value = value;
      }

      static Wrapper From(final String value) {
          return new Wrapper(value);
      }

      static Wrapper From(final Supplier<String> supplier) {
          return From(supplier.get());
      }

      Wrapper pipe(final Function<String, String> transformer) {
          return From(transformer.apply(value));
      }

      void pipe(final Consumer<String> consumer) {
          consumer.accept(value);
      }
    }
{% endhighlight %}

Them we could combine it with our functions:

{% highlight java %}
  From(name())
      .pipe(reverse())
      .pipe(print());
{% endhighlight %}

Or even:

{% highlight java %}
  From("hello world")
      .pipe(reverse())
      .pipe(reverse())
      .pipe(print());
{% endhighlight %}

This is something that could work. I choose the name Pipe for a reason, be could think in this pattern like the old Unix pipe system,
get something in and them get something out.

This is good, but we need still to manage those strange functional interface, what about if we could make them more simple? We can.

Firs we will change our functions as they where at the beginning:

{% highlight java %}
  private String name() {
      return "functional";
  }

  private String reverse(final String value) {
      return new StringBuffer(value).reverse().toString();
  }

  private void print(final Object value) {
      System.out.println(value.toString());
  }
{% endhighlight %}

Them we could call them like this:

{% highlight java %}
  From(this::name)
      .pipe(this::reverse)
      .pipe(this::print);
{% endhighlight %}

Or again:

{% highlight java %}
  From("hello world")
      .pipe(this::reverse)
      .pipe(this::reverse)
      .pipe(this::print);
{% endhighlight %}

The operator :: will do the magic for us, it will convert our functions in functional interfaces, so our Wrapper still working and we have the benefit
to work with standard functions for simplicity.

But to go even further we could generalize our Wrapper like this:

{% highlight java %}
  class Wrapper<Type> {
      private final Type value;

      private Wrapper(final Type value) {
          this.value = value;
      }

      static <AnyType> Wrapper<AnyType> From(final AnyType value) {
          return new Wrapper<>(value);
      }

      static <AnyType> Wrapper<AnyType> From(final Supplier<AnyType> supplier) {
          return From(supplier.get());
      }

      <OtherType> Wrapper<OtherType> pipe(final Function<Type, OtherType> transformer) {
          return From(transformer.apply(value));
      }

      void pipe(final Consumer<Type> consumer) {
          consumer.accept(value);
      }
  }
{% endhighlight %}

The functions that we are going to use now are:

{% highlight java %}
  private int random() {
      Random rand = new Random();

      return rand.nextInt();
  }

  private String reverse(String value) {
      return new StringBuffer(value).reverse().toString();
  }

  private void print(Object value) {
      System.out.println(value.toString());
  }

  private int square(final int value) {
      return (int) Math.pow(value, 2);
  }

  private String text(final int value) {
      return Integer.toString(value);
  }
{% endhighlight %}

The we could do many different things with them:

{% highlight java %}
  From("hello world")
      .pipe(this::reverse)
      .pipe(this::print);

  From(this::random)
      .pipe(this::print);

  From(12545)
      .pipe(this::square)
      .pipe(this::text)
      .pipe(this::reverse)
      .pipe(this::print);
{% endhighlight %}

As you could see these allow us to work with any type, any class/object and connect to functions, each of those functions is basically
a block, that has a simple input and a simple output but it could be complex and precise, and we pipe them together.

These functions could be unit tested, they could be replace and combine with others in order to create more complex operations, they are really encapsulated.

This as well force us to work with immutable objects since each block create new objects, even our pipes create new wrappers.

Is this really something that we need to use? Not really but is similar to how many of the functional APIs works, including standard and reactive streams.

So to answer the main question: "Why we should use functional programming?"

Not because syntax, not because is trendy, just do it if you could find a useful piece of code that allow you to solve a problem in a way that make sense for you.