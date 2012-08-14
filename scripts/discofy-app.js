(function () {
  'use strict';

  // Instantiate global sp object and import scripts
  var sp      = getSpotifyApi(1)
    , models  = sp.require('sp://import/scripts/api/models')
    , views   = sp.require('sp://import/scripts/api/views')
    , auth    = sp.require('sp://import/scripts/api/views')
    , _       = sp.require('scripts/underscore.min')
    , $       = sp.require('scripts/jquery.min');

  sp.require('scripts/chosen.jquery');

  var friendsList       = []
    , permissions       = []
    , appId             = '192337954211372'
    , requestRoot       = 'https://graph.facebook.com/me'
    , discofyUrl        = 'http://discofy.herokuapp.com/game/new'
    , searchResultsList = new models.Playlist()
    , currentPlaylistUri;

  var $title            = $('h1#title')
    , $newGameForm      = $('#new-game-form')
    , $createGame       = $('button#create-game')
    , $currentGames     = $('ul#current-games')
    , $listens          = $('ul#listens')
    , $searchResults    = $('ul#search-results')
    , $searchInput      = $('input#search-input')
    , $spinner          = $('.right .loading');

  // Get logged in user's friend IDs
  var getUserData = function (accessToken, ttl) {
    var params      = $.param({ 'access_token': accessToken })
      , currentUser = requestRoot + params
      , listensUrl  = requestRoot + '/music.listens' + params
      , friendsUrl  = requestRoot + '/friends' + params;

    $.getJSON(friendsUrl, function (resp) {
      // fb, wtf kind of property name is 'data'?
      var html = _.map(resp.data, function (friend) {
        friendsList.push(friend.id);
        return '<option value="' + friend.id + '">' + friend.name + '/option>';
      });

      $('select#players').append(html.join(''));
      $('.chzn-select').chosen();

      $newGameForm.hide();
      $newGameForm.css('visibility', 'visible');
    });

    // Populate the list of the current user's games
    $.getJSON(currentUser, function (resp) {
      if (!_.isObject(resp)) return;

      var html = _.map(resp.games, function (game) {
        return '<li id="' + game.uri + '"><a href="#">' + game.title + '</a></li>';
      });
      $currentGames.append(html.join(''));
    });

    // Get user's recent listens
    // TODO: use a templating framework
    $.getJSON(listensUrl, function (resp) {
      var listens = _.first(resp.data, 10)
        , html = _.map(listens, function (listen) {
            var url   = listen.data.song.url
              , name  = listen.data.song.title;
            models.Track.fromURI(url, function (t) {
              var img = 'img src="' + t.image + '" />'
                , link = '<a href="' + url + '">' + img + '<br/>' + name + '</a>';
              return '<li id="' + t.uri + '">' + link + '</li>';
            });
          });

      $listens.append(html.join(''));
    });
  };

  var init = function () {
    // Auth with facebook
    auth.authenticateWithFacebook(appId, permissions, {
      onSuccess: getUserData
    , onFailure: function (error) {
        window.console.log('Auth failed with error: ' + error);
      }
    , onComplete: function () { /* noop */ }
    });
  };

  var updatePlaylistView = function (uri) {
    var $gameHeader = $('#current-game-header')
      , $gameList   = $('#current-game-list')
      , $gameOwner  = $('#current-game-owner')
      , $gameCount  = $('#current-game-count');

    currentPlaylistUri = uri;

    $('.right').children().hide();
    $spinner.fadeIn();

    // Spin loading indicator
    // TODO: use CSS3 animations here
    var t = window.setInterval(function () {
      var s = $spinner.css('background-position-x')
        , old = parseInt(s.substring(0, s.length - 2), 10)
        , position = (old - 30) %360;
      $spinner.css('background-position-x', position + 'px');
    }, 20);

    var playlist  = models.Playlist.fromURI(uri)
      , username  = uri.split(':')[2]
      , player    = new views.Player();

    player.context = playlist;
    $('.right .sp-player, .right .sp-list').remove();

    // Create a view for the list and pass it to the player
    var listView = new views.List(playlist);
    $gameHeader.after(listView.node);
    $gameHeader.after(player.node);

    $gameList.empty().append('<a href="' + uri + '">' + playlist.data.name + '</a>');
    $gameOwner.text('Created by ' + username);
    $gameCount.text(playlist.length + ' tracks');

    // Light styling for playlists
    $('.sp-list').addClass('sp-light');

    $('.right').children.fadeIn();
    window.clearInterval(t);
    $spinner.fadeOut();

    renderSearchResults();
    $('.sp-list').addClass('sp-light');
  };

  /*
   * Use the search model to search for songs
   */
  var runSearch = function (query) {
    var search = new models.Search(query);
    search.pageSize = 10;
    search.searchAlbums = false;
    search.searchArtists = false;
    search.searchPlaylists = false;
    search.searchType = models.SEARCHTYPE.SUGGESTION;

    // Remove all previous results
    searchResultsList.tracks.forEach(function (track) {
      searchResultsList.remove(track);
    });

    search.observe(models.EVENT.CHANGE, function () {
      var count = 0;
      search.tracks.forEach(function (track) {
        if (count < 10) {
          searchResultsList.add(track);
          count++;
        }
      });
    });

    search.appendNext();
  };

  /*
   * Render search results list view and append to DOM
   */
  var renderSearchResults = function () {
    var searchResults = new views.List(searchResultsList);
    $searchResults.empty().append(searchResults.node);
  };

  /*
   * Check if next track added has one word in common with previous track
   */
  var isTrackValid = function (t1, t2) {
    var getTokens = function (track) {
      // Remove parens and split on words
      var tokens = track.name.replace(')', '').replace('(', '').split(' ');
      // Append words in all artist names
      _.each(track.artists, function (artist) {
        tokens.concat(artist.name.split(' '));
      });
      return tokens;
    };

    var t1Tokens = getTokens(t1)
      , t2Tokens = getTokens(t2);

    // TODO: use underscore function for 'at least one'
    _.each(t1Tokens, function (token) {
      if (token.length > 2 && t2Tokens.indexOf(token) !== -1) {
        return true;
      }
    });
    return false;
  };

  /*
   * Attempt to add the given track to the current playlist and
   * show appropriate success or error states.
   */
  var addToCurrentGame = function (trackUri) {
    var playlist = models.Playlist.fromURI(currentPlaylistUri);

    if (playlist.length < 1) {
      playlist.add(trackUri);
      $title.addClass('success').delay(500).removeClass('success');
    } else {
      var oldTrack = playlist.tracks[playlist.length - 1];
      models.Track.fromURI(trackUri, function (newTrack) {
        if (isTrackValid(newTrack, oldTrack)) {
          playlist.add(trackUri);
          $title.addClass('success').delay(500).removeClass('success');
        } else {
          $title.addClass('active').delay(2000).removeClass('active');
        }
      });
    }
  };

  /*
   * Hit the discofy API to create a new game
   */
  var createNewGame = function (title, owner, players) {
    var params = {
          title: title
        , owner: owner
        , id: owner
        };

    // Get selected friend ids and store as an array within post params
    params['users[]'] = _.map(players, function (friend) {
      return friendsList[parseInt(friend.id.substr(15), 10)];
    });

    $.post(discofyUrl, params, function (resp) {
      updatePlaylistView(resp.uri);
    });
  };

  // Attach event handlers to page elements
  $(function () {
    $newGameForm.on('click', function (e) {
      $(this).slideToggle('fast');
    });

    $createGame.on('click', function (e) {
      var name      = $('input#playlist-name').val()
        , author    = $('input#author-id').val()
        , selected  = $('ul.chzn-results').find('.result-selected');

      if (name !== '') {
        createNewGame(name, author, selected);
      }
    });

    // Switch between currently open games
    $currentGames.on('click', 'li', function (e) {
      $currentGames.children('li').removeClass('active');
      $(this).addClass('active');
      updatePlaylistView(this.id);
    });

    $listens.on('click', 'li', function (e) {
      e.preventDefault();
      addToCurrentGame(this.id);
    });

    $searchInput.on('keydown', function (e) {
      runSearch($(this).val());
      // Light styling for playlists
      $('.sp-list').addClass('sp-light');
    });

    $searchResults.on('click', 'a.sp-track', function (e) {
      e.preventDefault();
      addToCurrentGame(this.href);
    });

    // Initialize the game view with the first playlist
    updatePlaylistView($currentGames.children('li')[0].id);
    renderSearchResults();
  });

})();
