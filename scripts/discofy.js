/* Instantiate the global sp object; include models & views */
var sp = getSpotifyApi(1),
    models = sp.require('sp://import/scripts/api/models'),
    views = sp.require('sp://import/scripts/api/views'),
    auth = sp.require('sp://import/scripts/api/auth');

/* Authentication params */
var permissions = [],
    app_id = '192337954211372',
    request_url = 'https://graph.facebook.com/me';


exports.init = init;

function init() {
    auth.authenticateWithFacebook(app_id, permissions, {
        onSuccess : function(accessToken, ttl) {
            var friends_url = request_url + '/friends?access_token=' + accessToken;
            $.getJSON(friends_url, function(data) {
                var friends = data.data,
                    $select = $("select#players");
                for (var i = 0; i < friends.length; i++) {
                    var friend = friends[i];
                    $select.append("<option value='" + friend.id + "'>" + friend.name + "</option>");
                }
                
                $(".chzn-select").chosen();
                $("#new-game-form").hide();
            });
            
            var me_url = request_url + '?access_token=' + accessToken;
            $.getJSON(me_url, function(data) {
                $("input#author-id").val(data.id);
            });
        },
        onFailure : function(error) {
            console.log("Authentication failed with error: " + error);
        },
        onComplete : function() { }
    });
}

$(document).ready(function() {
    var $new_game_form = $("#new-game-form"),
        tracks = models.library.tracks;
    
    // User ids of owners and participants, Spotify URI for new playlist
    $("#new-game").on("click", function(event) {
        $new_game_form.slideToggle("fast");
    });
    
    $("button#create-game").on("click", function(event) {
        var name = $("input#playlist-name").val(),
            newPlaylist = new models.Playlist(name);
        
        newPlaylist.add(models.Track.fromURI(tracks[0].data.uri));
        console.log(newPlaylist);
        
        /*
        var player = new views.Player();
        player.context = newPlaylist;
        $('#player').append(player.node);
        var playlist = new views.List(newPlaylist);
        $('#player').append(playlist.node);
        */
        
        $("input#playlist-uri").val(newPlaylist.uri);
    });
});
