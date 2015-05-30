# Server Sent Events, Rickshaw, and Flask for Real Time Graphing

This isn't particularly hard to do in and of itself, it's just that there's a labryinth of features, framesworks, and technologies to contend with that all seem to drown each other out.
So after trying to use a couple of things that seemed to promise "all-in-one" functionality, I found it was just easier to glue a few things together, and it seems to work reasonably well.


# Running The Demo

Tested with Python3, on a MacBook running Chrome, and using whatever's in the `bower.json` file for the JavaScript parts.

```sh
$ python webserver/app.py
```

Then, visit `localhost:8000` or equivalent to see the magic take place.

# Contributing

If I've made a major mistake, don't hesitate to inform me, but if it's an 
aesthetic issue, just fork the repo and make your own modifications.


# Neutral Summary

## New Rickshaw Series

I created a subclass of `Rickshaw.Series` in order to better understand what's going on,
and also because I wanted to make a few small modifications.
In particular, it no longer requires specifying `timeInterval` or `timeBase` when
creating the `Series`, because perhaps what you are plotting is not a function of time.

The downside is that your graph may thrash about resizing itself as data comes
in, but this can be fixed by filling in default values yourself before starting
the stream.


# Opinionated Writeup

## Remarks

### Why is there an opinionated writeup? 
Well, I originally wrote a bunch of stuff down for future-me while I was trying
to get this to work, and then after it was working, my desire to modify the
tone.
In the end, it's not *that* opinionated, but there are parts where frustration 
or confusion might be taken as an invitation to start a flame war. 

I wrote this for a personal project, using a hodge-podge of information from
the Internet, but I thought it might help people who were as bewildered (as I was a
few hours ago) by how something so apparently simple was so hard to *actually do*.
Additionally, I am not 100% certain about the licensing situation, so if you're
planning to use this demo as the basis of a globe-spanning realtime graphing 
corporate juggernaut, you should probably reimplement 
everything from scratch while imagining Larry Ellison and Nathan Myhrvold 
standing behind you wearing biker leathers and cradling lead pipes in a 
menacing fashion.
Or at least check that this repo doesn't inadvertantly include code which is 
someone else's intellectual property.

### Obligatory Comments on JavaScript as a Language

This is my first time working with JavaScript, and while previously I found it
unappealing, I now can see why people really, really like aspects of the 
language... but the parts that are terrible are truly something to behold. 
But, in the end, I got everything working, and it seems to work.
That feels dangerous, because I don't understand what's going on in depth, and 
so I am probably writing code that is less than perfectly safe and performant.
The fact that it runs even in spite of this is probably the best illustration 
of why sites get pwned, or why my phone turns into a miniature space heater
when visiting otherwise unremarkable pages.


## Server Sent Events

[See the documentation](https://developer.mozilla.org/en-US/docs/Server-sent_events/Using_server-sent_events) if you're curious, but basically there's some new HTML5 technology that you can use to stream data without having to use any modules.

You get events like:

```
data: 3.123


data: text works


data: {"also": "json_messages too"}
```

To actually implement it in your page, use something like

```js
// Create a new EventSource
var evtSrc = new EventSource("/stream");

// Handle messages which only have a 'data' field
evtSrc.onmessage = function(e) {
	var obj = JSON.parse(e.data);
	console.log(obj);
};

// Handle events, which have an 'event' field and probably a 'data' field too
source.addEventListener('message', function(e) {
  console.log(e.data);
}, false);
```


## Rickshaw

Use Rickshaw to generate graphs and keep track of things. 
I made use of the documentation and examples here:

- http://code.shutterstock.com/rickshaw/
- http://code.shutterstock.com/rickshaw/examples/
- https://github.com/shutterstock/rickshaw

You might have to actually peer into the source code in order to get things 
working as you like them.

Under the hood it uses D3, and the guy who wrote that is pretty cool.

```js
// Generate a graph
var graph = new Rickshaw.Graph( {
    element: document.getElementById("chart"),
    width: 540,
    height: 240,
    renderer: 'line',
    series: new Rickshaw.Series.Sliding([{ name: 'mySeries'}], undefined, {
        maxDataPoints: 100,
    })
} );

// Render the graph
graph.render();
```

Rickshaw is nice, but like many things in JS-land, it's somewhat strange.
The `Rickshaw.Series` is not really a series, more like a series container, and
it supports adding new series on the fly, which is weird.
I am assuming that it was probably done this way because there's some hidden 
coupling between it and the rest of the library that is not easy to expose, and
that having a complete separation would be cumbersome or slow.

... or that it's just a deliberate way of messing with programmers.
However, it's not especially tough to modify.


## Flask

[Flask](http://flask.pocoo.org/) is easy to get up and running, and it allows us to send data generated by Python processes to the browser. 

We implement a mini class for encoding the SSEs properly:

```python
# Server sent events
class ServerSentEvent:
    FIELDS = ('event', 'data', 'id')
    def __init__(self, data, event=None, event_id=None):
        self.data = data
        self.event = event 
        self.id = event_id 

    def encode(self):
        if not self.data:
            return ""
        ret = []
        for field in self.FIELDS:
            entry = getattr(self, field) 
            if entry is not None:
                ret.extend(["%s: %s" % (field, line) for line in entry.split("\n")])
        return "\n".join(ret) + "\n\n"
```

Using hyper-advanced routing, and implementing the server-sent events as a generator, we have our demo.

```python
@app.route("/", methods=['GET'])
def get_index():
    return render_template('index.html')

@app.route("/stream")
def stream():
    def gen():
        while True:
            data = json.dumps({'mySeries': random.random()})
            ev = ServerSentEvent(data, 'new_data')
            print(ev.encode())
            yield ev.encode()
            time.sleep(1.0)

    return Response(gen(), mimetype="text/event-stream")
```

## Actually Using This


Consider changing how your event stream is managed in Python. 
[One of the inspirations for this demo](http://flask.pocoo.org/snippets/116/) 
used `gevent`, so something of a more asynchronous persuasion might be helpful.

Also, you're going to want to futz around with the HTML, and maybe swap out 
the `onmessage()` function used for transporting the graph data for an event 
handler if you plan on incorporating multiple graphs.