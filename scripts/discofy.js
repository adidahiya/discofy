/* Instantiate the global sp object; include models & views */
var sp = getSpotifyApi(1),
    models = sp.require('sp://import/scripts/api/models'),
    views = sp.require('sp://import/scripts/api/views'),
    auth = sp.require('sp://import/scripts/api/auth');

/* Authentication params */
var permissions = ['user_actions.music'],
    app_id = '192337954211372',
    request_url = 'https://graph.facebook.com/me/music.listens';


exports.init = init;

function init() {
    auth.authenticateWithFacebook(app_id, permissions, {
        onSuccess : function(accessToken, ttl) {
            var url = request_url + '?access_token=' + accessToken;
            $.getJSON(url, function(data) {
                var listens = data.data;
                for(var i=0;i<listens.length;i++) {
                    var tracklink = listens[i].data.song.url;
                    var trackname = listens[i].data.song.title;
                    $('#listens').append('<li><a href="' + tracklink + '">' + trackname + '</a></li>');
                }
            });
        },
        onFailure : function(error) {
            console.log("Authentication failed with error: " + error);
        },
        onComplete : function() { }
    });
}
