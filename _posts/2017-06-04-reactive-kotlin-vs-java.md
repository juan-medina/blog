---
layout: post
title: Reactive Kotlin vs Java
date: 2017-06-04 08:00:00
author: Juan Medina
comments: true
categories: [Programming]
image: /assets/img/reactor.jpg
image-sm: /assets/img/reactor.jpg
---

For me the best way to [learn something is by example](https://github.com/LearningByExample){:target="_blank"}, so instead to create [HelloWords](https://en.wikipedia.org/wiki/%22Hello,_World!%22_program){:target="_blank"} I've been translating my [Java Reactive Spring 5 Webflux example](https://github.com/LearningByExample/reactive-ms-example){:target="_blank"} into [Kotlin](https://github.com/LearningByExample/KotlinReactiveMS){:target="_blank"}, and now that is done is time to analyze the results.

*I'm not going to talk about performance here, I've done JMeter load tests on both services and they virtual identical, response times are just decimals apart. However sometimes Kotlin seams to perform better, I'll not get into conclusions until I research more.*

First lest look at how many life of code we have create for each project:

|Lines of Code | Src  | Test |
|--------------|-----:|-----:|
|Java          | 1004 | 1172 |
|Kotlin        |  721 | 1017 |

<br/>This is a expected result since Kotlin syntax will be always shorten and easer to understand.

Now when we look at the maxim complexity reported by [https://codebeat.co](https://codebeat.co){:target="_blank"}

|Complexity    |Max|
|--------------|--:|
|Java          | 45|
|Kotlin        |  8|

<br/>I think we need to do a deep down on this.

*I've need to modify some line breaks in order to fit the web, please check the repos*

Let's look at one of the methods in the [more complex class in Java](https://github.com/LearningByExample/reactive-ms-example/blob/master/src/main/java/org/learning/by/example/reactive/microservices/services/GeoLocationServiceImpl.java){:target="_blank"}:

{% highlight java %}
  Mono<SunriseSunset> createResult(final Mono<GeoTimesResponse> geoTimesResponseMono) {
      return geoTimesResponseMono.flatMap(geoTimesResponse -> {
          if ((geoTimesResponse.getStatus() != null) && (geoTimesResponse.getStatus()
              .equals(STATUS_OK))) {
              return Mono.just(new SunriseSunset(geoTimesResponse.getResults().getSunrise(),
                      geoTimesResponse.getResults().getSunset()));
          } else {
              return Mono.error(new GetSunriseSunsetException(SUNRISE_RESULT_NOT_OK));
          }
      });
  }
{% endhighlight %}


And the equivalent method for the same [class in Kotlin](https://github.com/LearningByExample/KotlinReactiveMS/blob/master/src/main/kotlin/org/learning/by/example/reactive/kotlin/microservices/KotlinReactiveMS/services/SunriseSunsetServiceImpl.kt){:target="_blank"}:

{% highlight kotlin %}
  open internal fun createResult(geoTimesResponseMono: Mono<GeoTimesResponse>) =
    geoTimesResponseMono.flatMap {
        with(it){
            if (status == STATUS_OK) with(results) { SunriseSunset(sunrise, sunset).toMono() }
            else GetSunriseSunsetException(SUNRISE_RESULT_NOT_OK).toMono()
        }
    }
{% endhighlight %}

Many times this is because of the [extensions](https://github.com/LearningByExample/KotlinReactiveMS/blob/master/src/main/kotlin/org/learning/by/example/reactive/kotlin/microservices/KotlinReactiveMS/extensions/UtilExtensions.kt){:target="_blank"} system that allow to write really tide code.

Let's look at one of the methods in [one of the handler class](https://github.com/LearningByExample/reactive-ms-example/blob/master/src/main/java/org/learning/by/example/reactive/microservices/handlers/ApiHandler.java){:target="_blank"}:
{% highlight java %}
  Mono<ServerResponse> serverResponse(Mono<LocationResponse> locationResponseMono) {
      return locationResponseMono.flatMap(locationResponse ->
              ServerResponse.ok().body(Mono.just(locationResponse), LocationResponse.class));
  }
{% endhighlight %}

And the equivalent method for the same [class in Kotlin](https://github.com/LearningByExample/KotlinReactiveMS/blob/master/src/main/kotlin/org/learning/by/example/reactive/kotlin/microservices/KotlinReactiveMS/handlers/ApiHandler.kt){:target="_blank"}:
{% highlight kotlin %}
  fun serverResponse(locationResponseMono: Mono<LocationResponse>): Mono<ServerResponse> =
    locationResponseMono.flatMap { ok() withBody it }
{% endhighlight %}

In fact spring framework has create [custom extensions for Kotlin](https://spring.io/blog/2017/01/04/introducing-kotlin-support-in-spring-framework-5-0){:target="_blank"}.


Let's look at our [api router function class](https://github.com/LearningByExample/reactive-ms-example/blob/master/src/main/java/org/learning/by/example/reactive/microservices/routers/ApiRouter.java){:target="_blank"}:
{% highlight java %}
  static RouterFunction<?> doRoute(final ApiHandler apiHandler, final ErrorHandler errorHandler) {
      return
              nest(path(API_PATH),
                  nest(accept(APPLICATION_JSON_UTF8),
                      route(GET(LOCATION_WITH_ADDRESS_PATH), apiHandler::getLocation)
                      .andRoute(POST(LOCATION_PATH), apiHandler::postLocation)
                  ).andOther(route(RequestPredicates.all(), errorHandler::notFound))
              );
  }
{% endhighlight %}

And the equivalent [class in Kotlin](https://github.com/LearningByExample/KotlinReactiveMS/blob/master/src/main/kotlin/org/learning/by/example/reactive/kotlin/microservices/KotlinReactiveMS/routers/ApiRouter.kt){:target="_blank"}:
{% highlight kotlin %}
  fun doRoute() = router {
      (accept(APPLICATION_JSON_UTF8) and API_PATH).nest {
          GET(LOCATION_WITH_ADDRESS_PATH)(handler::getLocation)
          POST(LOCATION_PATH)(handler::postLocation)
          path(ANY_PATH)(errorHandler::notFound)
      }
  }
{% endhighlight %}

Definitely Kotlin is more simpler and readable, but this is not only the main code lest check the test for our tests.

Testing our ThrowableTranslator in [Java](https://github.com/LearningByExample/reactive-ms-example/blob/master/src/test/java/org/learning/by/example/reactive/microservices/handlers/ThrowableTranslatorTest.java){:target="_blank"}
{% highlight java %}
  @Test
  void translatePathNotFoundExceptionTest() throws Exception {
    assertThat(PathNotFoundException.class, translateTo(HttpStatus.NOT_FOUND));
  }

{% endhighlight %}

And the same test in [Kotlin](https://github.com/LearningByExample/KotlinReactiveMS/blob/master/src/test/kotlin/org/learning/by/example/reactive/kotlin/microservices/KotlinReactiveMS/handlers/ThrowableTranslatorTest.kt){:target="_blank"}
{% highlight kotlin %}
  @Test
  fun translatePathNotFoundExceptionTest() {
      PathNotFoundException::class `translates to` HttpStatus.NOT_FOUND
  }
{% endhighlight %}

But lets use a more complex test that includes mocking.

Testing one of the services error in [Java](https://github.com/LearningByExample/reactive-ms-example/blob/master/src/test/java/org/learning/by/example/reactive/microservices/handlers/ApiHandlerTests.java){:target="_blank"}
{% highlight java %}
  @Test
  void getLocationNotFoundTest() {
      ServerRequest serverRequest = mock(ServerRequest.class);
      when(serverRequest.pathVariable(ADDRESS_VARIABLE)).thenReturn(GOOGLE_ADDRESS);
      doReturn(LOCATION_NOT_FOUND).when(geoLocationService).fromAddress(any());
      doReturn(SUNRISE_SUNSET).when(sunriseSunsetService).fromGeographicCoordinates(any());

      ServerResponse serverResponse = apiHandler.getLocation(serverRequest).block();
      assertThat(serverResponse.statusCode(), is(HttpStatus.NOT_FOUND));
      ErrorResponse error = HandlersHelper.extractEntity(serverResponse, ErrorResponse.class);
      assertThat(error.getError(), is(NOT_FOUND));

      reset(geoLocationService);
      reset(sunriseSunsetService);
  }
{% endhighlight %}

And the same test in [Kotlin](https://github.com/LearningByExample/KotlinReactiveMS/blob/master/src/test/kotlin/org/learning/by/example/reactive/kotlin/microservices/KotlinReactiveMS/handlers/ApiHandlerTests.kt){:target="_blank"}
{% highlight kotlin %}
  @Test
  fun getLocationNotFoundTest(){
      (geoLocationService `will return` LOCATION_NOT_FOUND).fromAddress(any())
      (sunriseSunsetService `will return` SUNRISE_SUNSET).fromGeographicCoordinates(any())
      val serverRequest = mock<ServerRequest>()
      (serverRequest `will return` GOOGLE_ADDRESS).pathVariable(ADDRESS_VARIABLE)

      val serverResponse = apiHandler.getLocation(serverRequest).block()
      serverResponse.statusCode() `should be` HttpStatus.NOT_FOUND
      val errorResponse : ErrorResponse = serverResponse.extractEntity()
      errorResponse.message `should equal to` NOT_FOUND

      geoLocationService reset `mock responses`
      sunriseSunsetService reset `mock responses`
  }
{% endhighlight %}

In these cases the number of lines is not the key factor but the readability of the Kotlin test is great.

**Conclusions**

With a syntax that make things simpler and more readable I'll stick with Kotlin for my personal projects for a while meanwhile I still learning Reactive Programming.
