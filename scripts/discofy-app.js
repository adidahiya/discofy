(function () {
  'use strict';

  // Instantiate global sp object
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
    , searchResultsList = new models.Playlist()
    , currentPlaylistUri;

  var $newGameForum = $('#new-game-form');

  var getUserData = function (accessToken, ttl) {
    var friendsUrl  = requestRoot + '/friends'
      , currentUser = requestRoot + $param

    // Get logged in user's friend IDs
    var params = { 'access_token': accessToken };
    friendsUrl += $.param(params);

    $.getJSON(friendsUrl, function (resp) {
      var friends = resp.data     // fb, wtf kind of property name is 'data'
        , $select = $('select#players');

      var html = _.map(friends, function (friend) {
        friendsList.push(friend.id);
        return '<option value="' + friend.id + '">' + friend.name + '/option>';
      });

      $select.append(html.join(''));
    });

    // TODO

  };

  var init = function () {
    // Auth with facebook
    auth.authenticateWithFacebook(appId, permissions, {
      onSuccess: getUserData
    , onFailure: function (error) {
        console.log('Auth failed with error: ' + error);
      }
    , onComplete: function () { /* noop */ }
    });
  };

  var updatePlaylistView = function (uri) {
    // TODO
  };

  // Search for songs
  var runSearch = function (query) {
    // TODO
  };

  // Check if next track added has one word in common with previous track
  var isTrackValid = function (t1, t2) {
    // TODO
  };

  var addToCurrentGame = function (track_uri) {
    // TODO
  };

  $(function () {
    // TODO
  });

})();