/* Instantiate the global sp object; include models & views */
var sp = getSpotifyApi(1),
    models = sp.require('sp://import/scripts/api/models'),
    views = sp.require('sp://import/scripts/api/views'),
    auth = sp.require('sp://import/scripts/api/auth'),
    friendsList = [];

/* Authentication params */
var permissions = [],
    app_id = '192337954211372',
    request_url = 'https://graph.facebook.com/me';


exports.init = init;

function init() {
    var $new_game_form = $("#new-game-form");
    
    auth.authenticateWithFacebook(app_id, permissions, {
        onSuccess : function(accessToken, ttl) {
            var friends_url = request_url + '/friends?access_token=' + accessToken;
            $.getJSON(friends_url, function(data) {
                var friends = data.data,
                    $select = $("select#players");
                for (var i = 0; i < friends.length; i++) {
                    var friend = friends[i];
                    $select.append("<option value='" + friend.id + "'>" + friend.name + "</option>");
                    friendsList.push(friend.id);
                }
                
                $(".chzn-select").chosen();
                $new_game_form.hide();
                $new_game_form.css("visibility", "visible");
            });
            
            var me_url = request_url + '?access_token=' + accessToken;
            $.getJSON(me_url, function(data) {
                $("input#author-id").val(data.id);
            });
            
            var listening_url = request_url + '/music.listens?access_token=' + accessToken;
            $.getJSON(listening_url, function(data) {
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
    
    var discofy_url = "";
    $.get(discofy_url, {
        user : $("input#author-id").val()
    }, function(data) {        
        for (var i = 0; i < data.length; i++) {
            var name = data[i].name,
                count = data[i].count;
            $("ul#current-games").append("<li><a href='#!'>" + name + "</a> - " + count + " songs</li>");
        }
    });
}

$(document).ready(function() {
    var $new_game_form = $("#new-game-form"),
        tracks = models.library.tracks;
    
    $("#new-game").on("click", function(event) {
        $new_game_form.slideToggle("fast");
    });
    
    $("button#create-game").on("click", function(event) {
        var name = $("input#playlist-name").val(),
            author = $("input#author-id").val();
        
        if (name !== "") {
            /*
            playlist = models.Playlist.fromURI(uri);
            console.log(playlist);
            
            var player = new views.Player();
            player.context = newPlaylist;
            $('#player').append(player.node);
            var playlist = new views.List(newPlaylist);
            $('#player').append(playlist.node);
            */
            
            var discofy_url = "",
                selected = $("ul.chzn-results").find(".result-selected"),
                players = [];
            
            // Get selected friend ids and push into players array for POST request
            for (var i = 0; i < selected.length; i++) {
                var index = selected[i].id.substr(15);
                players.push(friendsList[parseInt(index)]);
            }
            
            $.post(discofy_url, { 
                name : name,
                author : author,
                players : players
            }, function(data) {
                console.log("Request callback");
            });
        }
    });
});
