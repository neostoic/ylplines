# ylplines - Clarity for Yelp
# Copyright (C) 2016  Jeff Lee
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.
"""Views handler for 'main' Django application"""
from django.db.models import Avg
from django.shortcuts import render, get_object_or_404, render_to_response

from djYlplines.celery import app
from main.engine.smoothing import get_review_graph_data
from main.models import Business, Review
from main.forms import FrontSearchForm
from main.engine.search_businesses import search_for_businesses, \
    get_business_reviews, update_business_reviews
from main import tasks


def index(request):
    """Renders front page of website"""
    if 'query' in request.GET:
        form = FrontSearchForm(request.GET)
        if form.is_valid():
            print("form found valid")
            query = form.cleaned_data['query']
            location = form.cleaned_data['location']
            businesses = search_for_businesses(query, location)
            context = {
                'businesses': businesses,
                'form': form,
            }
            return render(request, 'main/index.html', context)
        else:
            form = FrontSearchForm()
    else:
        form = FrontSearchForm()
    return render(request, 'main/index.html', {'form': form})


def search_with_ajax(request):
    """Handles ajax request when user searches"""
    if 'query' in request.GET and 'location' in request.GET:
        form = FrontSearchForm(request.GET)
        if form.is_valid():
            print("form found valid from ajax")
            query = form.cleaned_data['query']
            location = form.cleaned_data['location']
            businesses = search_for_businesses(query, location)
            context = {
                'businesses': businesses,
                'form': form,
            }
            return render_to_response("main/search_results_snippet.html",
                                      context)
        else:
            form = FrontSearchForm()
            return render_to_response("main/search_results_snippet.html", {'form': form})
    return render_to_response("main/search_results_snippet.html")


def retrieve_ylp_with_ajax(request):
    """Handles ajax request to fetch reviews for a business from the db"""
    if 'business_id' in request.GET:
        business_id = request.GET.get('business_id')
        business = Business.objects.get(id=business_id)

        update_business_reviews(business)

        ylpline_ratings, review_ratings, smooth_rating, sparkline, sparkline_6mo, sparkline_12mo, sparkline_24mo = get_review_graph_data(business)
        context = {
            'sparkline': sparkline,
            'sparkline_6mo': sparkline_6mo,
            'sparkline_12mo': sparkline_12mo,
            'sparkline_24mo': sparkline_24mo,
            'smooth_rating': smooth_rating,
        }
    return render_to_response("main/retrieve_ylp_snippet.html", context)


def enqueue_fetch_reviews_with_ajax(request):
    """Handles ajax request to enqueue task to fetch reviews from Yelp"""
    if 'business_id' in request.GET:
        business_id = request.GET.get('business_id')
        task_result = tasks.enqueue_fetch_reviews.delay(business_id)
        #print(type(task_result))
        task_id = task_result.id
        #print(type(task_id))
        print("Task ID: " + str(task_id))
        #print(type(task_result.state))
        print("Task State: " + str(task_result.state))
        #task_state = task.state
        context = {
            'task_id': task_id,
        #    'task_state': task_state,
        }
    return render_to_response("main/task_id_snippet.html",
                              context)

def check_fetch_state_with_ajax(request):
    if 'task_id' in request.GET:
        task_id = request.GET.get('task_id').rstrip()
        print("check: " + str(task_id))
        task_result = tasks.enqueue_fetch_reviews.AsyncResult(task_id)
        print("task result: " + str(task_result))
        print("result: " + str(task_result.result))
        print(str(task_result.state))
        task_state = task_result.state
        context = {
            'task_state': task_state,
        }
    return render_to_response("main/task_state_snippet.html", context)


def business(request, business_id):
    """Renders the business details page"""
    business = get_object_or_404(Business, id=business_id)
    get_business_reviews(business)
    reviews = Review.objects.filter(business=business).order_by('publish_date')
    ylpline_ratings, review_ratings, current_ylpline_rating, sparklines, sparklines_6mo, sparklines_12_mo, sparklines_24mo = get_review_graph_data(business)
    review_count = reviews.count()
    review_average = round(reviews.aggregate(Avg('rating'))['rating__avg'], 2)
    context = {'reviews': reviews,
               'review_count': review_count,
               'review_average': review_average,
               'current_ylpline_rating': current_ylpline_rating,
               'ylpline_ratings': ylpline_ratings,
               'review_ratings': review_ratings,
               }

    return render(request, 'main/business.html', context)
