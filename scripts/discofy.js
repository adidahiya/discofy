/* Instantiate the global sp object; include models & views */
var sp = getSpotifyApi(1),
    models = sp.require('sp://import/scripts/api/models'),
    views = sp.require('sp://import/scripts/api/views'),
    auth = sp.require('sp://import/scripts/api/auth'),
    friendsList = [];

/* Facebook authentication params */
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
                var listens = data.data,
                    $listens = $("#listens"),
                    num_listens = Math.min(listens.length, 10);
                    
                for(var i=0;i<num_listens;i++) {
                    var tracklink = listens[i].data.song.url,
                        trackname = listens[i].data.song.title;
                    
                    var track = models.Track.fromURI(tracklink, function(t) {
                        var img = "<img src='" + t.image + "' />";
                        $listens.append("<li><a href='" + tracklink + "'>" + img + "<br/>" + trackname + "</a></li>");
                    });
                    
                    // $('#listens').append('<li><a href="' + tracklink + '">' + trackname + '</a></li>');       
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
        if (typeof data !== "object") return;
        
        for (var i = 0; i < data.length; i++) {
            var name = data[i].name,
                count = data[i].count;
            $("ul#current-games").append("<li><a href='#!'>" + name + "</a> - " + count + " songs</li>");
        }
    });
}

function updatePlaylistView(uri) {
    var playlist = models.Playlist.fromURI(uri),
        username = "",
        count = playlist.length;
    
    // Create a player and fill it with the playlist
    var player = new views.Player();
    player.track = playlist.get(0);
    player.context = playlist;
    
    $(".right .sp-player").remove();
    $(".right .sp-list").remove();
    
    // Create a view for the list and pass it to the player
    var listView = new views.List(playlist);
    $("#current-game-header").after(listView.node);
    $("#current-game-header").after(player.node);
    
    $("#current-game-list").text(playlist.data.name);
    $("#current-game-owner").text("Created by " + username);
    $("#current-game-count").text(String(count) + "tracks");
    
    // Light styling for playlists
    $(".sp-list").addClass("sp-light");
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
                console.log("POST response:");
                console.log(data);
                
                updatePlaylistView(data.uri);
            });
        }
    });
    
    $("ul#current-games").on("click", "li", function(event) {
        $(this).parent().children("li").removeClass("active");
        $(this).addClass("active");
        
        var uri = this.id;
        updatePlaylistView(uri);
    });
    
    var firstPlaylist = $("ul#current-games").children("li")[0];
    updatePlaylistView(firstPlaylist.id);
    
});
