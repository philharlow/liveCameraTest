# Live camera test

### To Install
```npm i live-server -g```

```npm i ngrok -g```

### To Run
Start an instance of ngrok to expose an https url. Https is *required*

```ngrok http 8080```

Take note of the https://<unique>.ngrok.io url

Fire up the server locally, hot-reloading enabled

```line-server```

Now browse to the https ngrok address