# fishman-web
![](http://i.imgur.com/iFlX01o.png)

Download module and its dependencies from different package managers via web interface
<h4>What fishman-web tries to do?</h4>
More or less what fishman does, just via a web interface.<br>
In order to do that we set a few goals:<br>
1. Be AFAP (As Fast As Possible, yes, I made it up).<br>
2. Be in-memory only (except provider cache, as for now) since cloud services charge $ for storage.<br>
3. Update web clients what's up with their request, so they can keep doing what they're already doing (basically,nothing).<br>

Works well with [fishup](https://github.com/moshekrup/fishup) an app that loads fishman-web downloaded files and uploads them to private npm registry with ease :)
