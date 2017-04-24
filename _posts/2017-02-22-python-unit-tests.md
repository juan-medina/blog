---
layout: post
title: Python Unit Tests
date: 2017-02-22 23:41:11
author: Juan Medina
comments: true
categories: [Programming]
image: /assets/img/tdd.jpg
image-sm: /assets/img/tdd.jpg
---
I've an strong believe that programming in different languages is something that all developers should do, and do it so you face different problems and apply different technics to solve them.

Python is great for a lot of tasks, and I'm using it for tooling a lot, but I'm not doing much Unit Testing on it so I decide to improve and expand my tests.

So here is what I learn so far, if you want to skip these and go directly to the code [here is the git repo](https://github.com/LearningByExample/PythonUnitTests){:target="_blank"} with every example bellow.

I've decide to use [nose](http://nose.readthedocs.io/en/latest/){:target="_blank"} as test runner, and [PyHamcrest](https://pypi.python.org/pypi/PyHamcrest){:target="_blank"}  as the assertion framework, specially since I familiar with the popular [Java equivalent](https://code.google.com/archive/p/hamcrest/wikis/Tutorial.wiki){:target="_blank"}.

So lest start with the first example, testing this small class saved in a file named: *calc.py*

{% highlight python %}
class Calc(object):

    def sum(self, a, b):
        return a+b

    def sub(self, a, b):
        return a-b

{% endhighlight %}

And here our first test in a file named: *test_calc.py*

{% highlight python %}
from unittest import TestCase
from hamcrest import *
from calc import Calc


class TestCal(TestCase):

    def test_sum(self):
        calculator = Calc()
        result = calculator.sum(1, 2)
        assert_that(result, is_(3))

    def test_sub(self):
        calculator = Calc()
        result = calculator.sub(1, 2)
        assert_that(result, is_(-1))

{% endhighlight %}

To run the test just this in the same directory that both files are place:

{% highlight shell %}
~/ $ python -m nose
{% endhighlight %}

The first test is really simple and just we call our class methods and check in hamcrest style that result is what we expect.

{% highlight shell %}

..
----------------------------------------------------------------------
Ran 2 tests in 0.020s

OK
{% endhighlight %}

Let's make our class a bit more interesting adding a method that give the last result

{% highlight python %}
class Calc(object):
    _last_result = None

    def operation(self, result):
        self._last_result = result
        return self._last_result

    def sum(self, a, b):
        return self.operation(a + b)

    def sub(self, a, b):
        return self.operation(a - b)

    def result(self):
        return self._last_result
{% endhighlight %}

With the new test we could add some more bits, like concatenating expressions

{% highlight python %}
from unittest import TestCase
from hamcrest import *
from calc import Calc


class TestCal(TestCase):
    def test_sum(self):
        calculator = Calc()
        result = calculator.sum(1, 2)
        assert_that(result, is_(3))

    def test_sub(self):
        calculator = Calc()
        result = calculator.sub(1, 2)
        assert_that(result, is_(-1))

    def test_result(self):
        calc = Calc()
        result = calc.sum(1, 2)
        assert_that(calc.result(), is_(3), is_(result))
{% endhighlight %}

Now to go really crazy lets make our class to been able to repeat operation using some lambdas:

{% highlight python %}
class Calc(object):
    _last_result = None
    _last_operation = None
    _sum = lambda self, a, b: a + b
    _sub = lambda self, a, b: a - b

    def operation(self, function, a, b):
        self._last_result = function(a, b)
        self._last_operation = function

        return self._last_result

    def sum(self, a, b):
        return self.operation(self._sum, a, b)

    def sub(self, a, b):
        return self.operation(self._sub, a, b)

    def result(self):
        return self._last_result

    def repeat(self, a, b):
        return self.operation(self._last_operation, a, b)
{% endhighlight %}

Now for test we could test that this new method work, even creating a new lambda for it:
{% highlight python %}
om unittest import TestCase
from hamcrest import *
from types import *

from calc import Calc


class TestCal(TestCase):
    def test_sum(self):
        calculator = Calc()
        result = calculator.sum(1, 2)
        assert_that(result, is_(3))

    def test_sub(self):
        calculator = Calc()
        result = calculator.sub(1, 2)
        assert_that(result, is_(-1))

    def test_result(self):
        calc = Calc()
        result = calc.sum(1, 2)
        assert_that(calc.result(), is_(3), is_(result))

    def test_operation(self):
        calc = Calc()

        mult = lambda a, b: a * b
        result = calc.operation(mult, 5, 5)

        assert_that(result, is_(25))
        assert_that(calc._last_operation, is_(mult), is_(type(LambdaType)))

    def test_repeat(self):
        calc = Calc()

        result = calc.sum(1, 2)
        assert_that(result, is_(calc.result()))

        result = calc.repeat(2, 2)
        assert_that(result, is_(4))
{% endhighlight %}

Now for modification of our class lets create some validation of parameters raising exceptions
{% highlight python %}
from types import *


class Calc(object):
    _last_result = None
    _last_operation = None
    _sum = lambda self, a, b: a + b
    _sub = lambda self, a, b: a - b

    def operation(self, function, a, b):
        if not (type(a) is IntType):
            raise TypeError("a is not a number")
        if not (type(b) is IntType):
            raise TypeError("b is not a number")
        if not ((type(function) is MethodType) or (type(function) is FunctionType)):
            raise TypeError("function is not a function")

        self._last_result = function(a, b)
        self._last_operation = function

        return self._last_result

    def sum(self, a, b):
        return self.operation(self._sum, a, b)

    def sub(self, a, b):
        return self.operation(self._sub, a, b)

    def result(self):
        return self._last_result

    def repeat(self, a, b):
        return self.operation(self._last_operation, a, b)
{% endhighlight %}

and in our test will add checking that the exceptions are raise when they should:
{% highlight python %}
from unittest import TestCase
from hamcrest import *
from types import *

from calc import Calc


class TestCal(TestCase):
    def test_sum(self):
        calculator = Calc()
        result = calculator.sum(1, 2)
        assert_that(result, is_(3))

    def test_sub(self):
        calculator = Calc()
        result = calculator.sub(1, 2)
        assert_that(result, is_(-1))

    def test_result(self):
        calc = Calc()
        result = calc.sum(1, 2)
        assert_that(calc.result(), is_(3), is_(result))

    def test_operation(self):
        calc = Calc()

        mult = lambda a, b: a * b
        result = calc.operation(mult, 5, 5)

        assert_that(result, is_(25))
        assert_that(calc._last_operation, is_(mult), is_(type(LambdaType)))

    def test_repeat(self):
        calc = Calc()

        result = calc.sum(1, 2)
        assert_that(result, is_(calc.result()))

        result = calc.repeat(2, 2)
        assert_that(result, is_(4))

    def test_operations_with_invalid_function(self):
        calc = Calc()

        assert_that(calling(calc.operation).with_args("function", 1, 2),
                    raises(TypeError, "function is not a function"))

    def test_with_invalid_a_or_b(self):
        calc = Calc()

        for function in calc.sum, calc.sub:
            assert_that(calling(function).with_args("a", 2),
                        raises(TypeError, "a is not a number"))
            assert_that(calling(function).with_args(2, "b"),
                        raises(TypeError, "b is not a number"))

    def test_with_no_parameters(self):
        calc = Calc()

        for function in calc.sum, calc.sub, calc.operation:
            assert_that(calling(function).with_args(), raises(TypeError))
{% endhighlight %}

I think this if enough for today, next day maybe a different language.