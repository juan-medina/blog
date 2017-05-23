---
layout: post
title: Why we should use functional programming with Kotlin?
date: 2017-05-23 18:00:00
author: Juan Medina
comments: true
categories: [Programming]
image: /assets/img/kotlin.jpg
image-sm: /assets/img/kotlin.jpg
---
Recently I made a post about [why we should use functional programming](/2017/05/11/why-functional-programming/){:target="_blank"}, but since [I'm trying now to
learn Kotlin](https://github.com/LearningByExample/KotlinReactiveMS){:target="_blank"}, I like to update my previous entry with examples written in Kotlin.

And as before, this is not going to be about qualities, neither comparison with Java, this is about code, to show how we could solve solutions with it.

All the code posted here is available in [this git repo](https://github.com/LearningByExample/WhyFunctionalKotlin){:target="_blank"} and you could follow the tests incrementally to understand this concepts.

*note : I'm not an expert in Kotlin and probably many things that I do here are not how you should code it, this is just for demonstration porpoises.*

To simplify the code it will start from where we end in the previous post, with this Java class:


{% highlight java %}
  static class Wrapper<Type> {
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

Our functions:

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

And how we use it:

{% highlight java %}
  From(12545)
      .pipe(this::square)
      .pipe(this::text)
      .pipe(this::reverse)
      .pipe(this::print);

{% endhighlight %}

**Java 'like' approach**

A fist approach with a direct implementation from Java:

{% highlight kotlin %}
  class Wrapper<out Type : Any>(val value: Type) {
      fun <OtherType : Any> pipe(compose: (Type) -> OtherType) =
        Wrapper(compose.invoke(this.value))
  }
  fun <OtherType : Any> From(value: OtherType): Wrapper<OtherType> = Wrapper(value)
{% endhighlight %}

Our functions:

{% highlight kotlin %}
  fun <Type : Any> print(value: Type) = println(value)
  fun <Type : Any> text(value: Type) = value.toString()
  fun <Type : Any> reverse(value: Type) = value.toString().reversed()
  fun square(value: Int) = value.times(value)
{% endhighlight %}

And how to use it:

{% highlight kotlin %}
  From(12345)
      .pipe(this::reverse)
      .pipe(this::print)

  From("dlrow olleh")
      .pipe(this::reverse)
      .pipe(this::print)

  From(12545)
      .pipe(this::square)
      .pipe(this::text)
      .pipe(this::reverse)
      .pipe(this::print)
{% endhighlight %}

This is very look like to our Java implementation but shorter due some of the benefits from Kotlin, like we only need a pipe function since every
function in Kotlin returns a value Unit (equivalent to void) where there is not output.

However I think we could improve it, so let's do it so.

**Who need a wrapper class?**

Let's do just a pipe function attached to any type:

{% highlight kotlin %}
  fun <Type : Any, OtherType : Any> Type.pipe(compose: (Type) -> OtherType) =
    compose.invoke(this)
{% endhighlight %}

We don't need to change our functions, so the example is:

{% highlight kotlin %}
  12545
      .pipe(this::reverse)
      .pipe(this::print)

  "dlrow olleh"
      .pipe(this::reverse)
      .pipe(this::print)

  12545
      .pipe(this::square)
      .pipe(this::text)
      .pipe(this::reverse)
      .pipe(this::print)
{% endhighlight %}

This is nicer, and we get rid of the wrapper class because Kotlin extensions functions, but we could take another approach.

**Pipe as an operator!**

So let's change our pipe function to be an operator:

{% highlight kotlin %}
  infix fun <Type : Any, OtherType : Any> Type.pipe(compose: (Type) -> OtherType) =
    compose.invoke(this)
{% endhighlight %}

Now this could be use like this:
{% highlight kotlin %}
  12545 pipe this::reverse pipe this::print

  "dlrow olleh" pipe this::reverse pipe this::print

  12545 pipe this::square pipe this::text pipe this::reverse pipe this::print
{% endhighlight %}

Interesting but we could even do a step further we a couple of changes

**Semantics matters**

Let's create another infix, that actually use the previous one:

{% highlight kotlin %}
  infix fun <Type : Any, OtherType : Any> Type.pipe(compose: (Type) -> OtherType) =
    compose.invoke(this)

  infix fun <Type : Any, OtherType : Any> Type.and(compose: (Type) -> OtherType) =
    this pipe compose
{% endhighlight %}

And change our functions to be part of a companion object:

{% highlight kotlin %}
  companion object Do {
    fun <Type : Any> print(value: Type) = println(value)
    fun <Type : Any> text(value: Type) = value.toString()
    fun <Type : Any> reverse(value: Type) = value.toString().reversed()
    fun square(value: Int) = value.times(value)
  }
{% endhighlight %}

So now we could use them like this:

{% highlight kotlin %}
  12545 pipe Do::reverse and Do::print

  "dlrow olleh" pipe Do::reverse and Do::print

  12545 pipe Do::square and Do::text and Do::reverse and Do::print
{% endhighlight %}

I can understand that this whole operators things is not for everyone, neither to use for everything so we have one
last way to do this that may be better.

**Who need pipes? just connect things with normal Kotlin**

No pipe functions, change our normal functions into extensions:
{% highlight kotlin %}
  fun <Type : Any> Type.print() = println(this)
  fun Int.square() = this.times(this)
  fun <Type : Any> Type.text() = this.toString()
  fun <Type : Any> Type.reverse() = this.toString().reversed()
{% endhighlight %}

So know the example is:
{% highlight kotlin %}
  12545.reverse().print()

  "dlrow olleh".reverse().print()

  12545.square().text().reverse().print()
{% endhighlight %}

Any of this examples will have the same qualities that we talk about before, small blocks that connect things, that can be unit tested and
they could be use to simplify building complex functionality.

So to answer the main question: "Why we should use functional programming with Kotlin?"

So again, as I said in the previous post:
Not because syntax, not because is trendy, just do it if you could find a useful piece of code that allow you to solve a problem in a way that make sense for you.