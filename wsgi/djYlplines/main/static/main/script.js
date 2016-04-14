/**
 * ylplines - Clarity for Yelp
 * Copyright (C) 2016  Jeff Lee
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 * */
//How many ms to delay double-clicking of search button
var MILLS_TO_IGNORE_SEARCH = 30;
//Duration of shield sliding for businesses
var SLIDE_ANIMATION_DURATION = 1000;
//Boolean for if it's okay to enable the search button
var submit_ok = false;
//Boolean flag for if the server is searching for businesses already
var currently_handling_search = false;
var interval;

//Color constants for varying ratings for businesses, bolder
var FOUR_POINT_FIVE = '#FF5C58';
var FOUR_POINT_ZERO = '#FF8758';
var THREE_POINT_FIVE = '#FFA358';
var THREE_POINT_ZERO = '#FFB758';
var TWO_POINT_FIVE = '#FFC758' ;
var TWO_POINT_ZERO = '#FFD558';
var ONE_POINT_FIVE = '#FFE258';
var ONE_POINT_ZERO = '#FFF058';

//Color constants for varying ratings for businesses, pale (background)
var BG_FOUR_POINT_FIVE = '#FFC0C0';
var BG_FOUR_POINT_ZERO = '#FFD2C0';
var BG_THREE_POINT_FIVE = '#FFDDC0';
var BG_THREE_POINT_ZERO = '#FFE4C0';
var BG_TWO_POINT_FIVE = '#FFEAC0' ;
var BG_TWO_POINT_ZERO = '#FFEFC0';
var BG_ONE_POINT_FIVE = '#FFF4C0';
var BG_ONE_POINT_ZERO = '#FFF9C0';

/**
 * Document ready
 */
$(function() {
    controller = scroll_magic_init_controller();
    scroll_magic_pin_search(controller);
    set_up_listeners();
    check_for_valid_input_fields();
});

/**
 * Load business ylplines data
 *
 * @param button The fetch button of the business
 */
var load_business = function(button) {
    var business_wrapper
    var business_id

    $(button).prop('disabled', true);
    business_wrapper = $(button).closest('.business_wrapper')
    business_id = $(business_wrapper).data('business_id');
    show_business_is_loading(business_wrapper);
    process_enqueue_fetch_reviews(business_wrapper, business_id);
};


/**
 * Load business list results given the search query
 */
var load_results_content = function() {
    var business_id;
    $('.business_wrapper').each(function() {
        business_id = $(this).data('business_id');
        
        if ($(this).data('has_reviews') == 'False') {
            show_business_is_empty(this);
        }
        else {
            show_business_is_loading(this);
            process_ylp_retrieval(this, business_id);
        }
    })
};

var process_enqueue_fetch_reviews = function(business_wrapper, business_id) {
    var processServerResponse = function(server_response_data, status) {
        //console.log("Server data: " + server_response_data)
        var task_id = server_response_data;
        console.log("task_id: " + task_id);
        setTimeout(function(){
            process_check_fetch_state(business_wrapper, business_id, task_id)
        }, 3000);
        console.log("done with process_enqueue_fetch_reviews");
    }

    var config = {
        type: "GET",
        url: ENQUEUE_FETCH_URL,
        data: {
          'business_id': business_id,
        },
        dataType: 'html',
        success: processServerResponse
    };
    $.ajax(config);
};

var process_check_fetch_state = function(business_wrapper, business_id, task_id) {
    var task_finished = false;
    console.log("entered process_Check_fetch_state");
    var processServerResponse = function(server_response_data, status) {
        var task_state = server_response_data;
        console.log("task_state: " + task_state);

        if (task_state == 'SUCCESS' && !task_finished) {
            task_finished = true;
            process_ylp_retrieval(business_wrapper, business_id);
        }
    }

    var check_fetch_status = function(config, counter){
        if(!task_finished){
            setTimeout(function(){
                counter++;
                console.log("check_fetch_status ctr: " + counter);
                $.ajax(config);
                check_fetch_status(config, counter);
            }, 5000);
        }
    }

    var config = {
        type: "GET",
        url: CHECK_FETCH_STATE_URL,
        data: {
          'task_id': task_id,
        },
        dataType: 'html',
        success: processServerResponse
    };

    check_fetch_status(config, 0);
};

/**
 * Ajax process the review data for a business
 *
 * @param business_wrapper DOM element of the business
 * @param business_id Business ID
 */
var process_ylp_retrieval = function(business_wrapper, business_id) {
    var processServerResponse = function(server_response_data, status) {
        var sparkline_str, sparkline_data, sparkline, ylp_rating

        $('.ylp_content', business_wrapper).html(server_response_data);
        sparkline_str = $('.sparkline_content', business_wrapper).text();
        sparkline_str = sparkline_str.replace(/[\[\] ]+/g,'');
        sparkline_data = sparkline_str.split(",");
        for(var i=0; i<sparkline_data.length;i++) sparkline_data[i] = parseFloat(sparkline_data[i]);
        sparkline = $('.sparkline_content', business_wrapper)
        sparkline.highcharts('SparkLine', {
            series: [{
                data: sparkline_data,
                pointStart: 1
            }],
            tooltip: {
                headerFormat: '<span style="font-size: 8px">' + "ylp rating" + '</span><br/>',
                pointFormat: '<b>{point.y}</b>'
            },
        });

        sparkline_str = $('.sparkline_6mo_content', business_wrapper).text();
        sparkline_str = sparkline_str.replace(/[\[\] ]+/g,'');
        sparkline_data = sparkline_str.split(",");
        for(var i=0; i<sparkline_data.length;i++) sparkline_data[i] = parseFloat(sparkline_data[i]);
        sparkline = $('.sparkline_6mo_content', business_wrapper)
        sparkline.highcharts('SparkLineSmall', {
            series: [{
                data: sparkline_data,
                pointStart: 1
            }],
            tooltip: {
                headerFormat: '<span style="font-size: 8px">' + "ylp rating" + '</span><br/>',
                pointFormat: '<b>{point.y}</b>'
            },
        });

        sparkline_str = $('.sparkline_12mo_content', business_wrapper).text();
        sparkline_str = sparkline_str.replace(/[\[\] ]+/g,'');
        sparkline_data = sparkline_str.split(",");
        for(var i=0; i<sparkline_data.length;i++) sparkline_data[i] = parseFloat(sparkline_data[i]);
        sparkline = $('.sparkline_12mo_content', business_wrapper)
        sparkline.highcharts('SparkLineSmall', {
            series: [{
                data: sparkline_data,
                pointStart: 1
            }],
            tooltip: {
                headerFormat: '<span style="font-size: 8px; text-align: center">' + "ylp rating" + '</span><br/>',
                pointFormat: '<b>{point.y}</b>'
            },
        });


        sparkline_str = $('.sparkline_24mo_content', business_wrapper).text();
        sparkline_str = sparkline_str.replace(/[\[\] ]+/g,'');
        sparkline_data = sparkline_str.split(",");
        for(var i=0; i<sparkline_data.length;i++) sparkline_data[i] = parseFloat(sparkline_data[i]);
        sparkline = $('.sparkline_24mo_content', business_wrapper)
        sparkline.highcharts('SparkLineSmall', {
            series: [{
                data: sparkline_data,
                pointStart: 1
            }],
            tooltip: {
                headerFormat: '<span style="font-size: 8px; text-align: center">' + "ylp rating" + '</span><br/>',
                pointFormat: '<b>{point.y}</b>'
            },
        });

        ylp_rating = $('.ylp_rating_span', business_wrapper).text();
        ylp_rating = parseFloat(ylp_rating);
        change_hue(ylp_rating, business_wrapper);
        show_business_is_loaded(business_wrapper);
    }
    
    var config = {
        type: "GET",
        url: RETRIEVE_YLP_URL,
        data: {
          'business_id': business_id,
        },
        dataType: 'html',
        success: processServerResponse
    };
    $.ajax(config);
};

/**
 * Ajax process search query
 */
var process_search = function()  {
    //Get and trim the search text.
    var query = $('#id_query').val().trim();
    var location = $('#id_location').val().trim();

    if(query.length == 0|| location.length == 0)  {
        //Too short. Ignore the submission, and erase any current results.
        $('#id_query').html("");
        $('#id_location').html("");
    }
    else if(!currently_handling_search) {
        currently_handling_search = true;
        $('#id_location').blur();
        $('#submit_button').blur();

        $('#footer').animate({opacity: 0}, 500);
        console.log("hit server");
        //There is at least 1 character. Execute the search.
        var processServerResponse = function(server_response_data, status,
                        jqXHR_ignored)  {
            $('#submit_button').html("<img id='submit_button_image' src=" + HEART_IMG + " width='20' height='20'/>");
            $('#search_results_container').html(server_response_data);
            $('#search_results_container').css('display', 'block');
            scroll_to_results();
            $('.load_button').click(function() {
                load_business($(this));
             });
        }

        var config = {
          type: "GET",
          url: SEARCH_URL,
          data: {
              'query' : query,
              'location': location,
          },
          dataType: 'html', 
          beforeSend: function() {
                $('#submit_button').html("<img id='submit_button_image' src=" + HEART_IMG + " width='20' height='20'/>");
                var angle = 0;
                interval = setInterval(function(){
                    angle+=15;
                    $("#submit_button_image").rotate(angle);
                },50);
          },
          success: processServerResponse
        };
        $.ajax(config);
    }
};

/**
 * Scroll to business results
 */
var scroll_to_results = function() {
    $('html, body').animate({
        scrollTop: $("#search_results_container").offset().top-60
    }, 2000, function () {
        $('#submit_button').html("<img id='submit_button_image' src=" + SEARCH_IMG + " width='20' height='20'/>");
        clearInterval(interval);
        currently_handling_search = false;
        load_results_content();
    });

    $('#footer').animate({opacity: 1}, 500);

};

/**
 * Disable the search button
 */
var submit_disable = function() {
    $('#submit_button').prop('disabled', true);
    $('#submit_button').css({
        'cursor': 'default',
    });
    submit_ok = false;
};

/**
 * Enable the search button
 */
var submit_enable = function() {
    $('#submit_button').prop('disabled', false);
    $('#submit_button').css({
        'cursor': 'pointer',
    });
    submit_ok = true;

};

/**
 * Check if query forms have enough data to warrant enabling the search button
 */
var check_for_valid_input_fields = function() {
    var query = $('#id_query').val().trim();
    var location = $('#id_location').val().trim();
    if (query.length > 0 && location.length > 0) {
        submit_enable();
    }
    else {
        submit_disable();
    }
};

/**
 * Show that there is no review data for a business.
 *
 * @param business_wrapper DOM element for business
 */
var show_business_is_empty = function(business_wrapper) {
    $('.shield_empty', business_wrapper).css('display', 'block');
    slide_shield_empty_in($('.shield_empty', business_wrapper));
    //details_button_show(business_wrapper, false);
};

/**
 * Show that we're fetching review data for a business.
 *
 * @param business_wrapper DOM element for business
 */
var show_business_is_loading = function(business_wrapper) {
    slide_shield_empty_out($('.shield_empty', business_wrapper));
    details_button_hide(business_wrapper);
    $('.ylp_content', business_wrapper).animate({
        opacity: 0,
    }, {
        duration: SLIDE_ANIMATION_DURATION,
        queue: false,
    });
};

/**
 * Show that the review data for a business has been loaded and show the data
 *
 * @param business_wrapper DOM element for business
 */
var show_business_is_loaded = function(business_wrapper) {
    slide_shield_loading_out($('.shield_loading', business_wrapper));
    details_button_show(business_wrapper);
};

/**
 * Slides 'empty' shield into view
 *
 * @param shield_empty DOM element for 'empty' shield
 */
var slide_shield_empty_in = function(shield_empty) {
    $(shield_empty).css('display', 'block');
    $(shield_empty).animate({
        'left': 0,
    }, SLIDE_ANIMATION_DURATION);
};

/**
 * Slides the 'empty' shield out of view
 *
 * @param shield_empty DOM element for 'empty' shield
 */
var slide_shield_empty_out = function(shield_empty) {
    var width = $(shield_empty).width();
    $(shield_empty).animate({
        'left': width,
    }, SLIDE_ANIMATION_DURATION, function() {
        $(shield_empty).css('display', 'none');
    });
};

/**
 * Slides the 'loading' shield into view
 *
 * @param shield_loading DOM element for 'loading' shield
 */
var slide_shield_loading_in = function(shield_loading) {
    $(shield_loading).css('display', 'block');
    $(shield_loading).animate({
        'left': 0,
    }, SLIDE_ANIMATION_DURATION);
};

/**
 * Slides the 'loading' shield out of view
 *
 * @param shield_loading DOM element for 'loading' shield
 * @param business_wrapper DOM element for business
 */
var slide_shield_loading_out = function(shield_loading, business_wrapper) {
    var width = $(shield_loading).width();
    $(shield_loading).animate({
        'left': width,
    }, SLIDE_ANIMATION_DURATION, function() {
        $(shield_loading).css('display', 'none');
    });
    $('.ylp_content', business_wrapper).animate({
        opacity: 1,
    }, SLIDE_ANIMATION_DURATION);
};

/**
 * Set up event listeners
 */
var set_up_listeners = function() {
    $("#id_query").keyup(function(event){
        if(event.keyCode == 13){
            $("#id_location").focus();
        }
        else {
            check_for_valid_input_fields();
        }
        
    });

    $("#id_location").keyup(function(event){
        if(event.keyCode == 13 && submit_ok == true){
            $("#submit_button").click();
        }
        else {
            check_for_valid_input_fields();
        }
    });

    $("#id_query_label, #id_query").focusin(function() {
        focus_in_query();
    });

    $('#id_query_label, #id_query').focusout(function() {
        focus_out_query();
    });

    $("#id_location_label, #id_location").focusin(function() {
        focus_in_location();
    });

    $('#id_location_label, #id_location').focusout(function() {
        focus_out_location();
    });

    $('#submit_button').click(_.debounce(process_search,
        MILLS_TO_IGNORE_SEARCH, true));

}

/**
 * Transitions for when query form is in focus
 */
var focus_in_query = function() {
    $('#id_query_label').css('border-bottom', '5px solid #3493ff');
    $('#id_query').css('border-bottom', '5px solid #3493ff');
};

/**
 * Transitions for when query form becomes out of focus
 */
var focus_out_query = function() {
    $('#id_query_label').css('border-bottom', '2px solid #3493ff');
    $('#id_query').css('border-bottom', '2px solid #3493ff');
};

/**
 * Transitions for when location form becomes into focus
 */
var focus_in_location = function() {
    $('#id_location_label').css('border-bottom', '5px solid #3493ff');
    $('#id_location').css('border-bottom', '5px solid #3493ff');
};

/**
 * Transitions for when location form becomes out of focus
 */
var focus_out_location = function() {
    $('#id_location_label').css('border-bottom', '2px solid #3493ff');
    $('#id_location').css('border-bottom', '2px solid #3493ff');
};

/**
 * Hide the details button for a business
 *
 * @param business_wrapper DOM element of a business
 */
var details_button_hide = function(business_wrapper) {
    var element = $('.details_button', business_wrapper)
    $(element).prop('disabled', true);
    $(element).fadeTo(500, 0);
};

/**
 * Show the details button for a business
 * @param business_wrapper DOM element of a business
 */
var details_button_show = function(business_wrapper) {
    var element = $('.details_button', business_wrapper);
    $(element).prop('disabled', false);
    $(element).fadeTo(500, 1);
};

/**
 * Get the ScrollMagic controller
 *
 * @returns {ScrollMagic.Controller}
 */
var scroll_magic_init_controller = function() {
    return new ScrollMagic.Controller();
};

/**
 * Pin the search form to the header banner
 *
 * @param controller ScrollMagic controller
 */
var scroll_magic_pin_search = function(controller) {
    var containerScene = new ScrollMagic.Scene({
        triggerElement: '#form_input_id',
        triggerHook: 'onLeave',
        offset: -12
    })
    .setPin('#form_input_id')
    /*.addIndicators()*/
    .addTo(controller);
};

/**
 * Transition a business's DOM colors based on the rating the business has
 *
 * @param rating Business rating
 * @param business_wrapper DOM element of a business
 */
var change_hue = function(rating, business_wrapper) {
    if(rating >= 4.5) {
        change_business_hues(FOUR_POINT_FIVE, business_wrapper);
        change_business_bg_hues(BG_FOUR_POINT_FIVE, business_wrapper);
    }
    else if(rating >= 4) {
        change_business_hues(FOUR_POINT_ZERO, business_wrapper);
        change_business_bg_hues(BG_FOUR_POINT_ZERO, business_wrapper);
    }
    else if(rating >= 3.5) {
        change_business_hues(THREE_POINT_FIVE, business_wrapper);
        change_business_bg_hues(BG_THREE_POINT_FIVE, business_wrapper);
    }
    else if(rating >= 3) {
        change_business_hues(THREE_POINT_ZERO, business_wrapper);
        change_business_bg_hues(BG_THREE_POINT_ZERO, business_wrapper);
    }
    else if(rating >= 2.5) {
        change_business_hues(TWO_POINT_FIVE, business_wrapper);
        change_business_bg_hues(BG_TWO_POINT_FIVE, business_wrapper);
    }
    else if(rating >= 2) {
        change_business_hues(TWO_POINT_ZERO, business_wrapper);
        change_business_bg_hues(BG_TWO_POINT_ZERO, business_wrapper);
    }
    else if(rating >= 1.5) {
        change_business_hues(ONE_POINT_FIVE, business_wrapper);
        change_business_bg_hues(BG_ONE_POINT_FIVE, business_wrapper);
    }
    else {
        change_business_hues(ONE_POINT_ZERO, business_wrapper);
        change_business_bg_hues(BG_ONE_POINT_ZERO, business_wrapper);
    }
};

/**
 * Transition a business' foreground colors
 *
 * @param color The color to change to
 * @param business_wrapper DOM element of a business
 */
var change_business_hues = function(color, business_wrapper) {
    $('.ylp_rating_span', business_wrapper).css('background-color', color);
    $('.business_content', business_wrapper).css('border', '1px solid ' + color);
    $('.business_name_div', business_wrapper).css('background-color', color);
    $('.shadow', business_wrapper).css('box-shadow', 'inset 0 0 0 6px ' + color);
    $(business_wrapper).css('border', '1px solid ' + color);
    $('.business_left', business_wrapper).css({'border-left': '1px solid ' + color, 'border-right': '2px solid ' + color});
    $('.business_bar', business_wrapper).css({'border-bottom': '1px solid ' + color, 'background-color': color});
    $('.business_right', business_wrapper).css({'border-bottom': '1px solid ' + color});
};

/**
 * Transition a business' background colors
 * @param color The color to change to
 * @param business_wrapper DOM element of a business
 */
var change_business_bg_hues = function(color, business_wrapper) {
    $('.business_right', business_wrapper).css('background-color', color);
}

/**
 * Define ctor of a sparkline graph
 *
 */
 Highcharts.SparkLine = function (a, b, c) {
    var hasRenderToArg = typeof a === 'string' || a.nodeName,
        options = arguments[hasRenderToArg ? 1 : 0],
        defaultOptions = {
            chart: {
                renderTo: (options.chart && options.chart.renderTo) || this,
                backgroundColor: null,
                borderWidth: 0,
                type: 'line',
                margin: [2, 0, 2, 0],
                width: $('.sparkline_div').width()/3*2,
                height: 35,
                style: {
                    overflow: 'visible'
                },
                skipClone: true
            },
            title: {
                text: ''
            },
            credits: {
                enabled: false
            },
            xAxis: {
                labels: {
                    enabled: false
                },
                title: {
                    text: null
                },
                startOnTick: false,
                endOnTick: false,
                tickPositions: [],
                lineColor: 'rgba(0,0,0,0.1)',
            },
            yAxis: {
                endOnTick: false,
                startOnTick: false,
                labels: {
                    enabled: false
                },
                title: {
                    text: null
                },
                tickPositions: [0],
                gridLineWidth: 0,
            },
            legend: {
                enabled: false
            },
            tooltip: {
                backgroundColor: null,
                borderWidth: 0,
                shadow: false,
                useHTML: true,
                hideDelay: 0,
                shared: true,
                padding: 0,
                positioner: function (w, h, point) {
                    return { x: (point.plotX - w / 2)+25    , y: point.plotY - 30 };
                }
            },
            plotOptions: {
                series: {
                    animation: false,
                    lineWidth: 2,
                    shadow: false,
                    states: {
                        hover: {
                            lineWidth: 3
                        }
                    },
                    marker: {
                        radius: 0,
                        states: {
                            hover: {
                                radius: 4
                            }
                        }
                    },
                    fillOpacity: 0.25,
                    color: 'rgba(0,0,0,1)',
                },
                column: {
                    negativeColor: '#910000',
                    borderColor: 'silver'
                }
            }
        };

    options = Highcharts.merge(defaultOptions, options);

    return hasRenderToArg ?
        new Highcharts.Chart(a, options, c) :
        new Highcharts.Chart(options, b);
};

/**
 * Define the ctor of a small sparkline graph
 */
 Highcharts.SparkLineSmall = function (a, b, c) {
    var hasRenderToArg = typeof a === 'string' || a.nodeName,
        options = arguments[hasRenderToArg ? 1 : 0],
        defaultOptions = {
            chart: {
                renderTo: (options.chart && options.chart.renderTo) || this,
                backgroundColor: null,
                borderWidth: 0,
                type: 'line',
                margin: [2, 0, 2, 0],
                width: 50,
                height: 25,
                style: {
                    overflow: 'visible'
                },
                skipClone: true
            },
            title: {
                text: ''
            },
            credits: {
                enabled: false
            },
                        xAxis: {
                labels: {
                    enabled: false
                },
                title: {
                    text: null
                },
                startOnTick: false,
                endOnTick: false,
                tickPositions: [],
                lineColor: 'rgba(0,0,0,0.1)',
            },
            yAxis: {
                endOnTick: false,
                startOnTick: false,
                labels: {
                    enabled: false
                },
                title: {
                    text: null
                },
                tickPositions: [0],
                gridLineWidth: 0,
            },
            legend: {
                enabled: false
            },
            tooltip: {
                backgroundColor: null,
                borderWidth: 0,
                shadow: false,
                useHTML: true,
                hideDelay: 0,
                shared: true,
                padding: 0,
                positioner: function (w, h, point) {
                    return { x: (point.plotX - w / 2)+30, y: point.plotY - 30 };
                }
            },
            plotOptions: {
                series: {
                    animation: false,
                    lineWidth: 1,
                    shadow: false,
                    states: {
                        hover: {
                            lineWidth: 1
                        }
                    },
                    marker: {
                        radius: 0,
                        states: {
                            hover: {
                                radius: 2
                            }
                        }
                    },
                    fillOpacity: 0.25,
                    color: 'rgba(0,0,0,1)',
                },
            }
        };

    options = Highcharts.merge(defaultOptions, options);

    return hasRenderToArg ?
        new Highcharts.Chart(a, options, c) :
        new Highcharts.Chart(options, b);
};