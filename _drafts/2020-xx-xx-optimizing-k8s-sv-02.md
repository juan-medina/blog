---
layout: post
title: Optimizing Kubernetes Services - Part 2 &#58 Spring Web
date: 2020-01-12 23:00:00
author: Juan Medina
comments: true
categories: [Cloud,Programming]
image: /assets/img/graph.jpg
image-sm: /assets/img/graph.jpg
table-1:
  legend: Java 8  - Spring Boot 2.2.2 - Spring Web - Spring Data JDBC default settings, unoptimized
  headers:
  - C. Users
  - Pods
  - ART
  - TPS
  - Max CPU
  - Max MEM
  rows:
    - cols :
      - 1	
      - 1	
      - 39.16	
      - 25.49	
      - 403
      - 474
    - cols :
      - 10
      - 1
      - 570.47
      - 16.73
      - 916
      - 487
    - cols :
      - 25
      - 3
      - 1615.82
      - 14.72
      - 1049
      - 1454
    - cols :
      - 50
      - 5
      - 3190.98
      - 14.89
      - 1351
      - 2499
---

Some days ago we start this series of article with our [base example]({{ site.baseurl }}{% link _posts/2020-01-11-optimizing-k8s-sv-01.md %}){:target="_blank"}, now we have baseline that we could use to optimize the service. 


These are the number that we got, the ones that we will like to improve :

<table class="display data-table compact cell-border">
  <thead>
    <tr>
      {% for header in page.table-1.headers %}
      <th>{{ header }}</th>
      {% endfor %}
    </tr>
  </thead>
  <tbody> 
    {% for row in page.table-1.rows %}
    <tr>
      {% for col in row.cols %}
      <td class="dt-body-right">{{ col }}</td>
      {% endfor %}
    </tr>
    {% endfor %}
  </tbody>
</table>
{{ page.table-1.legend }}

_Note: The full code of this service is available at this [repository](https://github.com/LearningByExample/movies-spring-web){:target="_blank"}._

**Resources**

- [https://spring.io/guides/topicals/spring-boot-docker](https://spring.io/guides/topicals/spring-boot-docker){:target="_blank"}
- https://blog.gilliard.lol/2018/11/05/alpine-jdk11-images.html
- https://gist.github.com/pgilad/f5218c808e6007cbf553164a60dca89e