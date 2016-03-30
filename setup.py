#!/usr/bin/env python

from setuptools import setup

setup(
    name='ylplines',
    version='1.0',
    description='Yelp trends',
    author='Jeff Lee',
    author_email='jeffcjlee@gmail.com',
    url='jeffcjlee.com',
    install_requires=[
        'Django==1.8.4',
        'psycopg2',
        'six',
        'yelp',
        'lxml==3.4.4',
        'beautifulsoup4',
        'requests',
        'grequests',
        'coverage',
        'coveralls'
    ],
    dependency_links=[
        'https://pypi.python.org/simple/django/'
    ],
)
