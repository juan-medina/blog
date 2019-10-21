---
layout: post
title: Microservices Error Handling
date: 2018-02-10 00:00:00
author: Juan Medina
comments: true
categories: [Programming]
image: /assets/img/glass-1818065_1920.jpg
image-sm: /assets/img/glass-1818065_1920.jpg
---

Some days ago I was discusing with my colleage [Juan Antonio Breña](https://twitter.com/juanantoniobm) how you could end breaking your control flow when handling errors in a Microservice, specially relaying in mechanism such [`ControllerAdvice`](https://docs.spring.io/spring/docs/4.3.15.BUILD-SNAPSHOT/javadoc-api/org/springframework/web/bind/annotation/ControllerAdvice.html){:target="_blank"} and [`ExceptionHandler`](https://docs.spring.io/spring/docs/4.3.15.BUILD-SNAPSHOT/javadoc-api/org/springframework/web/bind/annotation/ExceptionHandler.html){:target="_blank"} when create Spring Boot Microservices in Java.



I told Juan that we may need to handle this probllem differently, so I decide to create a new project in our [Learning By Example](https://github.com/LearningByExample){:target="_blank"} GitHub meta group: [Microservices Error Handling](https://github.com/LearningByExample/MicroservicesErrorHandling){:target="_blank"}

The idea behind that project is to check how we could avoid to use [`ControllerAdvice`](https://docs.spring.io/spring/docs/4.3.15.BUILD-SNAPSHOT/javadoc-api/org/springframework/web/bind/annotation/ControllerAdvice.html) and [`ExceptionHandler`](https://docs.spring.io/spring/docs/4.3.15.BUILD-SNAPSHOT/javadoc-api/org/springframework/web/bind/annotation/ExceptionHandler.html), and even checked exceptions when handling errors in our Microservices.

Checked exceptions some times could leak the implementation details of our components, and they could even break our control flow.

Spring [`ControllerAdvice`](https://docs.spring.io/spring/docs/4.3.15.BUILD-SNAPSHOT/javadoc-api/org/springframework/web/bind/annotation/ControllerAdvice.html) or [`ExceptionHandler`](https://docs.spring.io/spring/docs/4.3.15.BUILD-SNAPSHOT/javadoc-api/org/springframework/web/bind/annotation/ExceptionHandler.html) could become the ultimate GOTOs, that some people my use to get errors and sent back to the consumers of the Microservice, jumping out on the execution of our business logic.

The approach described in the example is to handle errors as part of our business logic, avoiding unnecessary lost of our control flow.

This example is not about stop using [`ControllerAdvice`](https://docs.spring.io/spring/docs/4.3.15.BUILD-SNAPSHOT/javadoc-api/org/springframework/web/bind/annotation/ControllerAdvice.html), we may need to still using it to handle unexpected Runtime Exceptions, however relaying on it for handling our business errors isn't ideal.

Approach like the one in this example may become a better way to do it, however this is not the unique, neither definitive, solution.

We have created one wrapper class to support this concept named `Result<type>`, this class has two creation methods.

- `Result.create(object)` : That will create a wrapper containing the data to be returned.
- `Result.error(object)` : That will create a wrapper containing an error.


How to use this class is simple, for example:

{% highlight java %}
  public Result get(int id) {
    if (id == 1) return Result.create(new Customer(1, "super customer"));
    else if (id == -1)
      return Result.error(new BadParameters("bad parameters"));
    else
      return Result.error(new NotFound("customer not found"));
  }
{% endhighlight %}

`BadParameters` and `NotFound` are entities for our business logic that contain the desired information for handling these responses.

For handling the result we could just use the methods `isError()` and `getData()`.

{% highlight java %}
  Result result = operation();

  if(result.isError()){
    //do something with the error
  }else{
    Customer customer = result.getValue();
  }
{% endhighlight %}

Finally we use in our mapping a generic ResponseEntity we could return the wrapper value without needing to understand what contains.

For example:

{% highlight java %}
  @GetMapping("/customer/{id}")
    public ResponseEntity<?> get(@PathVariable() int id) {
    final Result result = customerService.get(id);
    final HttpStatus status = getStatus(result);

    return new ResponseEntity<>(result.getValue(), status);
  }
{% endhighlight %}

Since we may like to return different HTTP status, based on the error contained, we could create a helper that use the type of the class held on the wrapper.

{% highlight java %}
  private HttpStatus getStatus(final Result result){
    if (result.isError()) {
      if (result.getValue() instanceof NotFound)
        return HttpStatus.NOT_FOUND;
      else
        return HttpStatus.BAD_REQUEST;
    } else return HttpStatus.OK;
  }
{% endhighlight %}

To just run the example microservice you could just do from the command line:

{% highlight bash %}
  $ mvnw spring-boot run
{% endhighlight %}

To test the output when sending a correct customer id:

{% highlight bash %}
  $ curl -i http://localhost:8080/customer/1
  HTTP/1.1 200
  X-Application-Context: application
  Content-Type: application/json;charset=UTF-8
  Transfer-Encoding: chunked
  Date: Wed, 31 Jan 2018 09:33:01 GMT

  {
    "data" : "super customer",
    "id" : 1
  }
{% endhighlight %}

To test the output when sending a invalid customer id

{% highlight bash %}
  $curl -i http://localhost:8080/customer/-1
  HTTP/1.1 400
  X-Application-Context: application
  Content-Type: application/json;charset=UTF-8
  Transfer-Encoding: chunked
  Date: Wed, 31 Jan 2018 09:34:03 GMT
  Connection: close

  {
    "message" : "bad parameters"
  }
{% endhighlight %}

To test the output when sending a not found customer id

{% highlight bash %}
  $ curl -i http://localhost:8080/customer/2
  HTTP/1.1 404
  X-Application-Context: application
  Content-Type: application/json;charset=UTF-8
  Transfer-Encoding: chunked
  Date: Wed, 31 Jan 2018 09:34:48 GMT

  {
    "message" : "customer not found"
  }
{% endhighlight %}

The full example could be found under this repository:

[https://github.com/LearningByExample/MicroservicesErrorHandling](https://github.com/LearningByExample/MicroservicesErrorHandling){:target="_blank"}

I don't know if we definetly will be using this approach however I think I may rewrite it in Kotlin in somepoint.
