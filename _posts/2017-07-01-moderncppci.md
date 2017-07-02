---
layout: post
title: Modern C++ CI
date: 2017-07-01 18:00:00
author: Juan Medina
comments: true
categories: [Programming]
image: /assets/img/cpp_core_guidelines_logo.svg
image-sm: /assets/img/cpp_core_guidelines_logo.svg
---

C++ is most active than ever, with the [C++17 standard ready](http://www.open-std.org/jtc1/sc22/wg21/docs/papers/2017/n4661.html){:target="_blank"}, a widely support on C++14 [from major compilers](http://en.cppreference.com/w/cpp/compiler_support){:target="_blank"} and [C++20 planning on the way](https://isocpp.org/std/status){:target="_blank"} there is a interesting [future for the standard](https://www.youtube.com/watch?v=_wzc7a3McOs){:target="_blank"}.

Modern C++ is great, some people are even [calling it a new language](http://cppdepend.com/blog/?p=171){:target="_blank"}, but is not only the language what is evolving the tool-chain is getter better, so doing continuous integration for cross platform projects is simple and effective.

I decide to do a simple project using some of the C++14 features and following the [C++ Core Guidelines](https://github.com/isocpp/CppCoreGuidelines){:target="_blank"} whenever its possible. The result is available in this *[repository](https://github.com/LearningByExample/ModernCppCI){:target="_blank"}*.

**I set some goals to doing this project:**

- Project is organized with a logical structure
- Need to be a small C++14 project, but nothing really complicate.
- Will have at least two modules, a library and a program that uses it.
- Modern Unit Tests.
- It should use some third party software.
- CI will be triggered per commit and build using;
  - GCC & CLang on Linux
  - XCode on OSX
  - Visual Studio on Windows

**The initial project structure**

```
  /lib
    /src
    /include
    /test
  /app
    /src
    /test
  /third_party
```

Nothing complicated, and easy to manage, with a clear meaning of each folder.

**The simple program**

{% highlight C++ %}
#include "calc.h"
#include "logger.h"

int main(int argc, char *argv[]) {
  using namespace ModernCppCI;
  Logger::level(LogLevel::info);

  Logger log{__func__};

  log.info("doing some calculation");
  log.info(Calc{} << 1 << "+" << 2 << "*" << 5 << "-" << 3 << "/" << 4);

  return 0;
}
{% endhighlight %}

This program will output when run:

```
[2017-07-01 11:09:22.766] [console] [info] [main] doing some calculation
[2017-07-01 11:09:22.768] [console] [info] [main] 1 + 2 * 5 - 3 / 4 = 3
```
This example use a couple of classes defined in the library, *Calc* and *Logger* to display a simple calculation.

**Doing Unit Tests**

I decide to use the wonderful [Catch](https://github.com/philsquared/Catch){:target="_blank"} for doing the unit test, as an example:

{% highlight C++ %}
TEST_CASE("chain operations will work", "[calc]") {
  auto calc = Calc{} << 1 << "+" << 2 << "*" << 5 << "-" << 3 << "/" << 4;

  REQUIRE(calc.result() == 3);
}

TEST_CASE("we could stream results", "[calc]") {
  std::ostringstream string_stream{};

  string_stream << (Calc{} << 1 << "+" << 2);

  REQUIRE(string_stream.str() == "1 + 2 = 3");
}
{% endhighlight %}

We are not going into the detail in the implementation of the classes or the test, the *[repository](https://github.com/LearningByExample/ModernCppCI){:target="_blank"}* has all the details about it, lest focus now on the CI.

**Build and test in all platform**

We are going to use [CMake](https://cmake.org/){:target="_blank"} and [CTest](https://cmake.org/Wiki/CTest:FAQ){:target="_blank"} for creating our build so we start with the main *CMakeLists.txt* on the root of the project.

{% highlight CMake %}

# CMake build : global project

cmake_minimum_required (VERSION 3.3)

project (ModernCppCI)

set_property (GLOBAL PROPERTY USE_FOLDERS ON)

set (CMAKE_CXX_STANDARD 14)
set (CMAKE_CXX_STANDARD_REQUIRED ON)

set (THREADS_PREFER_PTHREAD_FLAG ON)
find_package (Threads REQUIRED)

add_subdirectory (third_party EXCLUDE_FROM_ALL)
add_subdirectory (lib)
add_subdirectory (app)

enable_testing ()

{% endhighlight %}

First we just set some settings, as that we are going to we require C++14, we will find the Thread library for any tool-chain, we include our directories, but we exlude for the third party other build targets that our dependencies could bring, and finally we set that this CMake project will have tests.

*Preparing the third party software*

The third part software that we are going to use is:

- [Catch](https://github.com/philsquared/Catch){:target="_blank"} for Unit Test.
- [spdlog](https://github.com/gabime/spdlog){:target="_blank"} for a very fast C++ logging library.

The third party software is cloned as submodules, so we use their original project structure.

Now we prepare a new *CMakeLists.txt* under the /third_party folder:

{% highlight CMake %}
# CMake build : third party

#configure directories
set (THIRD_PARTY_MODULE_PATH "${PROJECT_SOURCE_DIR}/third_party")

# catch

#configure directories
set (CATCH_MODULE_PATH "${THIRD_PARTY_MODULE_PATH}/Catch")
set (CATCH_INCLUDE_PATH "${CATCH_MODULE_PATH}/include")

#include custom cmake function
include ( "${CATCH_MODULE_PATH}/contrib/ParseAndAddCatchTests.cmake")

# spdlog

#configure directories
set (SPDLOG_MODULE_PATH "${THIRD_PARTY_MODULE_PATH}/spdlog")
set (SPDLOG_INCLUDE_PATH "${SPDLOG_MODULE_PATH}/include")

#set variables
set (THIRD_PARTY_INCLUDE_PATH  ${SPDLOG_INCLUDE_PATH})

#set variables for tests
set (TEST_THIRD_PARTY_INCLUDE_PATH  ${CATCH_INCLUDE_PATH})

#export vars
set (THIRD_PARTY_INCLUDE_PATH  ${THIRD_PARTY_INCLUDE_PATH} PARENT_SCOPE)
set (TEST_THIRD_PARTY_INCLUDE_PATH  ${TEST_THIRD_PARTY_INCLUDE_PATH} PARENT_SCOPE)

{% endhighlight %}

The most import part here is that we export two variables that will have the corresponding directories to add to the include paths for our targets and we push them to the parent scope so we could use them. Additionally for Catch we include a custom function that will allow to auto discover tests.

**Bulding the library**

For creating our library we add a new *CMakeLists.txt* under the /lib folder:

{% highlight CMake %}
# CMake build : library

#configure variables
set (LIB_NAME "${PROJECT_NAME}Lib")

#configure directories
set (LIBRARY_MODULE_PATH "${PROJECT_SOURCE_DIR}/lib")
set (LIBRARY_SRC_PATH  "${LIBRARY_MODULE_PATH}/src" )
set (LIBRARY_INCLUDE_PATH  "${LIBRARY_MODULE_PATH}/include")

#set includes
include_directories (${LIBRARY_INCLUDE_PATH} ${THIRD_PARTY_INCLUDE_PATH})

#set sources
file (GLOB LIB_HEADER_FILES "${LIBRARY_INCLUDE_PATH}/*.h")
file (GLOB LIB_SOURCE_FILES "${LIBRARY_SRC_PATH}/*.cpp")

#set library
add_library (${LIB_NAME} STATIC ${LIB_SOURCE_FILES} ${LIB_HEADER_FILES})

#export vars
set (LIBRARY_INCLUDE_PATH  ${LIBRARY_INCLUDE_PATH} PARENT_SCOPE)
set (LIB_NAME ${LIB_NAME} PARENT_SCOPE)

#test
enable_testing ()
add_subdirectory (test)
{% endhighlight %}

Here we set the desired include directories and we built a list of sources and header files, them we create the library and export a couple of variable so we could use them in our application, finally we add the test directory so we build the test for this library.

**Testing the library**

No we create a new *CMakeLists.txt* under the /lib/test directory:

{% highlight CMake %}
# CMake build : library tests

#configure variables
set (TEST_APP_NAME "${LIB_NAME}Test")

#configure directories
set (TEST_MODULE_PATH "${LIBRARY_MODULE_PATH}/test")

#configure test directories
set (TEST_SRC_PATH  "${TEST_MODULE_PATH}/src" )

#set includes
include_directories (${LIBRARY_INCLUDE_PATH} ${TEST_THIRD_PARTY_INCLUDE_PATH})

#set test sources
file (GLOB TEST_SOURCE_FILES "${TEST_SRC_PATH}/*.cpp")

#set target executable
add_executable (${TEST_APP_NAME} ${TEST_SOURCE_FILES})

#add the library
target_link_libraries (${TEST_APP_NAME} ${LIB_NAME} Threads::Threads)

# Turn on CMake testing capabilities
enable_testing()

#parse catch tests
ParseAndAddCatchTests (${TEST_APP_NAME})

{% endhighlight %}

We include the test sources and we link the test executable with our Library and the Threads library, finally we out discover the catch tests using the previously imported function in the third party modules.

**Building the application**

Building the application is now quite simple with a new *CMakeLists.txt* under the /app directory:

{% highlight CMake %}
# CMake build : main application

#configure variables
set (APP_NAME "${PROJECT_NAME}App")

#configure directories
set (APP_MODULE_PATH "${PROJECT_SOURCE_DIR}/app")
set (APP_SRC_PATH  "${APP_MODULE_PATH}/src" )

#set includes
include_directories (${LIBRARY_INCLUDE_PATH} ${THIRD_PARTY_INCLUDE_PATH})

#set sources
file (GLOB APP_SOURCE_FILES "${APP_SRC_PATH}/*.cpp")

#set target executable
add_executable (${APP_NAME} ${APP_SOURCE_FILES})

#add the library
target_link_libraries (${APP_NAME} ${LIB_NAME} Threads::Threads)

#test
enable_testing ()
add_subdirectory (test)
{% endhighlight %}

We just include the sources for the app, link with the libraries and include the test folder.

**Doing a simple test on the application**

For the application itself we are just going to running and check that end successfully, so we create a new *CMakeLists.txt* under the /app/test directory:

{% highlight CMake %}
# CMake build : main application test

#configure variables
set (APP_NAME "${PROJECT_NAME}App")
set (TEST_NAME "${APP_NAME}Test")

enable_testing ()
add_test (NAME ${TEST_NAME} COMMAND ${APP_NAME} )
{% endhighlight %}

Here we simply run the application and we use the CTest command add_test to run it, if the application fails this test will fail.

**CMake will handle it**

With this CMake will create our targets and link them together so if we change our lib their test will be build, so the application. If we run the test all required target will be build include the library and the application.

**Using CMake to create a project for our tool-chain**

To generate the projects, auto discovering everything, including what compiler we are going to use we could just:

{% highlight shell %}
  cmake -H. -BBuild
{% endhighlight %}

If you like to set a implicit compiler set the variable CXX=${COMPILER}, for example COMPILER could be gcc, clang and so on.

Auto detect in Windows usually generate a Visual Studio project since msbuild require it, but in OSX does not generate and XCode project, since is not required for compiling using XCode clang.

Specify build type debug/release

{% highlight shell %}
  # generate a debug project
  cmake -H. -BBuild -DCMAKE_BUILD_TYPE=Debug
  # generate a release project
  cmake -H. -BBuild -DCMAKE_BUILD_TYPE=Release
{% endhighlight %}

Specify architecture

{% highlight shell %}
  # 64 bits architecture
  cmake -H. -BBuild -Ax64
  # ARM architecture
  cmake -H. -BBuild -AARM
  # Windows 32 bits architecture
  cmake -H. -BBuild -AxWin32
{% endhighlight %}

Generate different project types

{% highlight shell %}
  # MinGW makefiles
  cmake -H. -BBuild -G "MinGW Makefiles"
  # XCode project
  cmake -H. -BBuild -G "XCode"
  # Visual Studio 15 2017 solution
  cmake -H. -BBuild -G "Visual Studio 15 2017"
{% endhighlight %}

**Build the project**

From the Build folder

{% highlight shell %}
  # build the default build type (in multi build types usually debug)
  cmake --build .
  # build a specific build type
  cmake --build . --config Release
{% endhighlight %}

**Run tests**

From the Build folder

{% highlight shell %}
  # run all test using the default build type
  ctest -V
  # run all test in Release build type
  ctest -V -C Release
{% endhighlight %}

This will run all our test and given stats about how long will take, which one fail and so on.

**Adding Travis CI**

No that we have our project ready we could building in travis for Linux and OSX. We will add this .travis.yml to our project:

{% highlight yaml %}
language: cpp
sudo: true

matrix:
  include:

    # Linux C++14 GCC builds
    - os: linux
      compiler: gcc
      addons: &gcc6
        apt:
          sources: ['ubuntu-toolchain-r-test']
          packages: ['g++-6']
      env: COMPILER='g++-6' BUILD_TYPE='Release'

    - os: linux
      compiler: gcc
      addons: *gcc6
      env: COMPILER='g++-6' BUILD_TYPE='Debug'

    # Linux C++14 Clang builds
    - os: linux
      compiler: clang
      addons: &clang38
        apt:
          sources: ['llvm-toolchain-precise-3.8', 'ubuntu-toolchain-r-test']
          packages: ['clang-3.8']
      env: COMPILER='clang++-3.8' BUILD_TYPE='Release'

    - os: linux
      compiler: clang
      addons: *clang38
      env: COMPILER='clang++-3.8' BUILD_TYPE='Debug'

    # OSX C++14 Clang Builds

    - os: osx
      osx_image: xcode8.3
      compiler: clang
      env: COMPILER='clang++' BUILD_TYPE='Debug'

    - os: osx
      osx_image: xcode8.3
      compiler: clang
      env: COMPILER='clang++' BUILD_TYPE='Release'


install:
  - DEPS_DIR="${TRAVIS_BUILD_DIR}/deps"
  - mkdir -p ${DEPS_DIR} && cd ${DEPS_DIR}
  - |
    if [[ "${TRAVIS_OS_NAME}" == "linux" ]]; then
      CMAKE_URL="http://www.cmake.org/files/v3.3/cmake-3.3.2-Linux-x86_64.tar.gz"
      mkdir cmake && travis_retry wget --no-check-certificate --quiet -O - ${CMAKE_URL} | tar --strip-components=1 -xz -C cmake
      export PATH=${DEPS_DIR}/cmake/bin:${PATH}
    elif [[ "${TRAVIS_OS_NAME}" == "osx" ]]; then
      which cmake || brew install cmake
    fi

before_script:
  - export CXX=${COMPILER}
  - cd ${TRAVIS_BUILD_DIR}
  - cmake -H. -BBuild -DCMAKE_BUILD_TYPE=${BUILD_TYPE} -Wdev
  - cd Build

script:
  - make -j 2
  - ctest -V -j 2
{% endhighlight %}

This will use a buld matrix to generate the project, build it and do the test for Linux (clang38  / gcc6) and OSX (XCode 8.3 clang) for Debug and Release targets.

**Adding Appveyor**

Finally we will use Appveyor for Visual Studio on  Windows builds adding a appveyor.yml to our project:

{% highlight yaml %}
# version string format -- This will be overwritten later anyway
version: "{build}"

os:
  - Visual Studio 2017
  - Visual Studio 2015

init:
  - git config --global core.autocrlf input
  # Set build version to git commit-hash
  - ps: Update-AppveyorBuild -Version "$($env:APPVEYOR_REPO_BRANCH) - $($env:APPVEYOR_REPO_COMMIT)"

install:
  - git submodule update --init --recursive

# Win32 and x64 are CMake-compatible solution platform names.
# This allows us to pass %PLATFORM% to CMake -A.
platform:
  - Win32
  - x64

# build Configurations, i.e. Debug, Release, etc.
configuration:
  - Debug
  - Release

#Cmake will autodetect the compiler, but we set the arch
before_build:
  - cmake -H. -BBuild -A%PLATFORM%

# build with MSBuild
build:
  project: Build\ModernCppCI.sln        # path to Visual Studio solution or project
  parallel: true                        # enable MSBuild parallel builds
  verbosity: normal                     # MSBuild verbosity level {quiet|minimal|normal|detailed}

test_script:
  - cd Build
  - ctest -V -j 2 -C %CONFIGURATION%
{% endhighlight %}

In this case we are going to build using Visual Studio 2015 and 2017 with Win32 and x64 architecture and Debug and Release targets.


**Summary**

So probably this is a more complex setup that initially anticipated but when is done working with it is really simple.

We could add new files just creating them in the right folders, work with our favorite IDE, run our tests and push to our git to get our CI reports.

Some IDE as CLion have a runner for Catch that allow us to run individual test with a couple of clicks, however we could do the same just filtering test by tags in our favorite IDE adding to the arguments of our test application any of the [Catch supported command line parameters](https://github.com/philsquared/Catch/blob/master/docs/command-line.md){:target="_blank"}.

In fact we could even use [this jenkins pluging](https://wiki.jenkins.io/display/JENKINS/CMake+Plugin){:target="_blank"} to get our CMake / CTest build, test and reported. But I'll leave that for other day.

Anyway I think this is something that I've really enjoy to learn and I'm sure that will continue to use in future C++ projects.

**references**

- [https://cmake.org/](https://cmake.org/)
- [https://docs.travis-ci.com/user/languages/cpp/](https://docs.travis-ci.com/user/languages/cpp/)
- [https://www.appveyor.com/docs/lang/cpp/](https://www.appveyor.com/docs/lang/cpp/)
- [https://github.com/isocpp/CppCoreGuidelines](https://github.com/isocpp/CppCoreGuidelines)
- [https://github.com/philsquared/Catch](https://github.com/philsquared/Catch)
- [https://github.com/gabime/spdlog](https://github.com/gabime/spdlog)
- [https://github.com/cognitivewaves/CMake-VisualStudio-Example](https://github.com/cognitivewaves/CMake-VisualStudio-Example)
- [http://derekmolloy.ie/hello-world-introductions-to-cmake/](http://derekmolloy.ie/hello-world-introductions-to-cmake/)
- [https://cmake.org/Wiki/CMake/Testing_With_CTest](https://cmake.org/Wiki/CMake/Testing_With_CTest)
- [https://www.appveyor.com/docs/lang/cpp/](https://www.appveyor.com/docs/lang/cpp/)
- [https://docs.travis-ci.com/user/languages/cpp/](https://docs.travis-ci.com/user/languages/cpp/)
- [https://github.com/philsquared/Catch/blob/master/docs/build-systems.md](https://github.com/philsquared/Catch/blob/master/docs/build-systems.md)
- [https://stackoverflow.com/questions/14446495/cmake-project-structure-with-unit-tests](https://stackoverflow.com/questions/14446495/cmake-project-structure-with-unit-tests)
