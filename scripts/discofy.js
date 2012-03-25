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

var current_playlist_uri, 
    search_results_list = new models.Playlist();

exports.init = init;

function init() {
    var $new_game_form = $("#new-game-form");
    
    auth.authenticateWithFacebook(app_id, permissions, {
        onSuccess : function(accessToken, ttl) {
            // Get logged in user's friend IDs
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
            
            // Get logged in user's ID
            var me_url = request_url + '?access_token=' + accessToken;
            $.getJSON(me_url, function(data) {
                $("input#author-id").val(data.id);
                
                // Now check the db for any current games with an ajax request
                var owner_id = $("input#author-id").val(),
                    discofy_url = "http://discofy.herokuapp.com/user/games?id=" + owner_id;
                    
                $.get(discofy_url, function(data) {   
                    if (typeof data !== "object") return;

                    var games = data.games,
                        $current_games = $("ul#current-games");
                    
                    // Populate the list of current games
                    for (var i = 0; i < games.length; i++) {
                        var name = games[i].title,
                            uri = games[i].uri,
                            playlist = models.Playlist.fromURI(uri),
                            count = playlist.length;

                        $current_games.append("<li id='" + uri + "'><a href='#!'>" + name + "</a> - " + count + " tracks</li>");
                    }
                });
            });
            
            // Get user's recent listens
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
                        $listens.append("<li id='" + t.uri + "'><a href='" + tracklink + "'>" + img + "<br/>" + trackname + "</a></li>");
                    });
                }
            });
            
        },
        onFailure : function(error) {
            console.log("Authentication failed with error: " + error);
        },
        onComplete : function() { }
    });
}

function updatePlaylistView(uri) {
    current_playlist_uri = uri;
    
    // Toggle loading indicator
    var $spinner = $(".right").find(".loading");
    
    $(".right").children().hide();
    $spinner.fadeIn();
    var interval = window.setInterval(function() {
        var s = $spinner.css("background-position-x"),
            old = parseInt(s.substring(0, s.length - 2)),
            position = (old - 30) % 360;
        $spinner.css("background-position-x", position + "px");
    }, 20);
    
    
    var playlist = models.Playlist.fromURI(uri),
        username = uri.split(':')[2],
        count = playlist.length;
    
    // Create a player and fill it with the playlist
    var player = new views.Player();
    player.context = playlist;
    
    $(".right .sp-player").remove();
    $(".right .sp-list").remove();
    
    // Create a view for the list and pass it to the player
    var listView = new views.List(playlist);
    $("#current-game-header").after(listView.node);
    $("#current-game-header").after(player.node);
    
    $("#current-game-list").html("<a href='" + uri + "'>" + playlist.data.name + "</a>");
    $("#current-game-owner").text("Created by " + username);
    $("#current-game-count").text(String(count) + " tracks");
    
    // Light styling for playlists
    $(".sp-list").addClass("sp-light");
    
    // Toggle loading indicator
    $(".right").children().fadeIn();
    window.clearInterval(interval);
    $spinner.fadeOut();
    
    renderSearchResults();
    $(".sp-list").addClass("sp-light");
}

function executeSearch(query) {
    var search = new models.Search(query);
    search.pageSize = 10;
    search.searchAlbums = false;
    search.searchArtists = false;
    search.searchPlaylists = false;
    search.searchType = models.SEARCHTYPE.SUGGESTION;
    
    search_results_list.tracks.forEach(function(track) {
       search_results_list.remove(track); 
    });
    
    search.observe(models.EVENT.CHANGE, function() {
        var count = 0;
    	search.tracks.forEach(function(track) {
    	    if (count > 9) return;
    	    search_results_list.add(track);
    	    count++;
    	});
    });

    search.appendNext();
}

function renderSearchResults() {
    // Render the search results view
    var search_results = new views.List(search_results_list);
    $("ul#search-results").html(search_results.node);
}

$(document).ready(function() {
    var $new_game_form = $("#new-game-form"),
        tracks = models.library.tracks;
    
    $("#new-game").on("click", function(event) {
        $new_game_form.slideToggle("fast");
    });
    
    $("button#create-game").on("click", function(event) {
        var name = $("input#playlist-name").val(),
            author = $("input#author-id").val(),
            discofy_url = "http://discofy.herokuapp.com/game/new",
            selected = $("ul.chzn-results").find(".result-selected"),
            players = [];
        
        if (name === "") return;
        
        // Get selected friend ids and push into players array for POST request
        for (var i = 0; i < selected.length; i++) {
            var index = selected[i].id.substr(15);
            players.push(friendsList[parseInt(index)]);
        }
        
        var params = { 
            title: name,
            owner: author,
            'users[]': players,
            id: author
        };
        console.log(params);
        $.ajaxSettings.traditional = true;
        $.ajax({
            type: "POST",
            url:  discofy_url,
            dataType: "json",
            async: true,
            data: params,
            success: function(data) {
                console.log("POST response:");
                console.log(data);
                
                updatePlaylistView(data.uri);
            }
        });
    });
    
    // Handler for switching between currently open games
    $("ul#current-games").on("click", "li", function(event) {
        $(this).parent().children("li").removeClass("active");
        $(this).addClass("active");
        
        var uri = this.id;
        updatePlaylistView(uri);
    });
    
    // Initialize current view with first playlist
    var firstPlaylist = $("ul#current-games").children("li")[0];
    updatePlaylistView(firstPlaylist.id);
    
    $("ul#listens").on("click", "li", function(event) {
        event.preventDefault();
        var track_uri = this.id,
            playlist = models.Playlist.fromURI(current_playlist_uri);
        
        playlist.add(track_uri);
    });
    
    renderSearchResults();
    
    $("input#search-input").on("keydown", function(event) {
        executeSearch($(this).val());
        // Light styling for playlists
        $(".sp-list").addClass("sp-light");
    });
    
    
    $("ul#search-results").on("click", "a.sp-track", function(event) {
        event.preventDefault();
        var track_uri = this.href,
            playlist = models.Playlist.fromURI(current_playlist_uri);
        
        playlist.add(track_uri);
    });
    
});
