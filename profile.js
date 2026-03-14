// Simple in-browser dataset of ~100 users for the project.
// This is for demo / frontend use only – real passwords must be stored hashed in a database.

(function () {
  'use strict';

  var users = Array.from({ length: 100 }).map(function (_, i) {
    var id = i + 1;
    return {
      id: id,
      email: 'user' + id + '@example.com',
      password: 'Pass' + id + '#',
      full_name: 'User ' + id,
      my_timeslot: 'Mon ' + ((id % 12) + 6) + ':00',
      benchpress_pr: 40 + (id % 40),
      dumbbell_pr: 10 + (id % 20),
      leaderboard_position: id,
    };
  });

  // Expose on window so any React / JS code in the project can use it.
  window.usersDataset = users;
})();
