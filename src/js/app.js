App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',

  init: function() {
    return App.initWeb3();
  },

  initWeb3: function() {
    if (typeof web3 !== 'undefined') {
      // If a web3 instance is already provided by Meta Mask.
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      // Specify default instance if no web3 instance provided
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
      web3 = new Web3(App.web3Provider);
    }
    return App.initContract();
  },

  initContract: function() {
    $.getJSON("ReviewClass.json", function(reviewclass) {
      // Instantiate a new truffle contract from the artifact
      App.contracts.ReviewClass = TruffleContract(reviewclass);
      // Connect provider to interact with contract
      App.contracts.ReviewClass.setProvider(App.web3Provider);

      App.listenForEvents();
      
      return App.render();
    });
  },

  listenForEvents: function() {
    App.contracts.ReviewClass.deployed().then(function(instance) {
      instance.randomevent({}, { // buggy code if I use submittedEvent, which should work
        fromBlock: 0,
        toBlock: 'latest'
      }).watch(function(error, event) {
        console.log("event triggered", event)
        App.render();
      });
    });
  },

  render: function() {
    var reviewInstance;
    var loader = $("#loader");
    var content = $("#content");

    loader.show();
    content.hide();

    // Load account data
    web3.eth.getCoinbase(function(err, account) {
      if (err === null) {
        App.account = account;
        $("#accountAddress").html("Your Account: " + account);
      }
    });

    // Load contract data
    App.contracts.ReviewClass.deployed().then(function(instance) {
      reviewInstance = instance;
      return reviewInstance.reviewCount();
    }).then(function(reviewCount) {
      var reviewListDisplay = $("#reviewListDisplay");
      reviewListDisplay.empty();

      for (var i = 1; i <= reviewCount; i++) {
        reviewInstance.reviews(i).then(function(review) {
          var productID = review[0];
          var orderNumber = review[1];
          var productName = review[2];
          var reviewMessage = review[3];
          var numStars = review[4];
          
          // Render candidate Result
          var stars = "<span>"
          for (var j = 1; j <= numStars; j++) {
            stars += "⭐️"
          }
          stars += "</span>"
          var reviewDisplayTemplate = "<tr><th>" + productID + "</th><td>" + orderNumber + "</td><td>" + productName + "</td><td>" + reviewMessage + "</td><td>" + stars + "</td></tr>"
          reviewListDisplay.append(reviewDisplayTemplate);
        });
      }

      loader.hide();
      content.show();
    }).catch(function(error) {
      console.warn(error);
    });
  },

  submitReview: function() {
    var orderNumber = $('#orderNumber').val();
    var productID = $('#productID').val();
    var productName = $('#productName').val();
    var numStars = $('#numStars').val();
    var reviewMessage = $('#reviewMessage').val();
    App.contracts.ReviewClass.deployed().then(function(instance) {
      return instance.addReview(productID, orderNumber, productName, reviewMessage, numStars, { from: App.account });
    }).then(function(result) {
      // Wait for votes to update
      $("#content").hide();
      $("#loader").show();
    }).catch(function(err) {
      console.error(err);
    });
  }
};

$(function() {
  $(window).load(function() {
    App.init();
  });
});