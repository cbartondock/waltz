(function($) {
	var cyHost = "",
		storage = new Storage();

	chrome.runtime.sendMessage({
		method: "getHost"
	}, function(host) {
		cyHost = host;
	});

	$(document).ready(function() {
		storage.getCredentials(function(sites) {
			for(key in sites) {
				var site = sites[key];

				var html = "<li data-username='"+site.username+"' data-password='"+site.password+"' data-key='"+key+"'>"
						   +"	<h3>"+ key +"</h3>"
						   +"	<button class='decrypt styled'>Decrypt</button>"
						   +"	<button class='deleteAccount styled'>Forget</button>";
						   +"	</li>"

				$(".sites-list").find("ul").append(html);
			}

			$(".sites-list").find(".decrypt").click(function() {
				var self = this;
				var parent = $(self).parent();
				var key = $(parent).data('key');
				var username = $(parent).data('username');
				var password = $(parent).data('password');

				checkAuthentication(function(authed) {
					if(authed) {
						decryptAndDisplay();
					} else{
						loginWithClef(decryptAndDisplay);
					}
				});

				function decryptAndDisplay() {
					chrome.runtime.sendMessage({
						method: "decrypt",
						key: key,
						value: password

					}, function(response) {
						$(self).remove();

						if(response.error) {
							alert(response.error);
							return false;
						} 

						var decryptedHTML =  "<label for='username'>Username:</label> "
											+"<input type='text' class='username' value='"+username+"' />"
											+"<label for='password'>Password:</label> "
											+"<input type='password' class='toggle password' value='"+response.output+"' />"
											+"<button class='togglePass closed'></button>"
											+"<button class='savePass styled'>Save</button>";

						$(parent).find(".deleteAccount").before(decryptedHTML);
					});
				}
			});

			var options;

			//The default options *should* have been loaded in by now
			chrome.storage.local.get("options", function(data) {
				if(typeof(data.options) === "object") {
					options = data.options;

					$("#cy-url").val(data.options.cy_url);
				}
			});

			$(".all-settings").find("input").change(function() {
				options[$(this).attr('name')] = $(this).val();

				chrome.storage.local.set({options: options});
				chrome.runtime.sendMessage({method: "refreshOptions"});
			});

			$(document).on('click', '.togglePass', function() {
				var toggleInput = $(this).siblings(".toggle");
				var val = $(toggleInput).val();

				if($(toggleInput).attr('type') === "password") {
					$(toggleInput).replaceWith("<input class='toggle password' type='text' value='"+val+"' />");
					$(this).removeClass("closed").addClass("open");
				} else {
					$(toggleInput).replaceWith("<input class='toggle password' type='password' value='"+val+"' />");
					$(this).removeClass("open").addClass('closed');
				}

			});

			$(document).on('click', '.savePass', function() {
				var self = this;

				chrome.runtime.sendMessage({
					method: "saveCredentials",
					domain_key: $(self).parent().data('key'),
					username: $(self).siblings(".username").val(),
					password: $(self).siblings(".password").val()
				}, function() {});

				$(self).addClass('success');
				setTimeout(function() {
					$(self).removeClass('success')
				}, 1000);
			});

			$(document).on('click', '.deleteAccount', function() {
				var self = this;

				chrome.runtime.sendMessage({
					method: "deleteCredentials",
					domain_key: $(self).parent().data('key')
				});
				$(self).parent().remove();
			});

			$(".nav-bar").find("li").click(function() {

				$(this).siblings('.active').removeClass('active');
				$(this).addClass('active');

				var target = $($(this).data('target'));
				$(".main-content").hide();
				$(target).show();
			});
		});
	});

	function checkAuthentication(cb) {
		chrome.runtime.sendMessage({
			method: "checkAuthentication"
		}, function(response) {
			if (!response.user) {
				if (typeof(cb) == "function") {
					cb(false);
				}
			} else {
				if (typeof(cb) == "function") {
					cb(true);
				}
			}
		});
	}

	function loginWithClef(callback) {
		var iFrame = $("<iframe>");
		$(iFrame).css({
			position: 'absolute',
			height: '100%',
			width: '100%'
		});

		$(iFrame).attr('src', cyHost+'/login');

		$(iFrame).on('load', function() {
			$(iFrame)[0].contentWindow.postMessage(null, cyHost);
		});

		$("body").append(iFrame);

		$(iFrame).css({
			position: 'absolute',
			height: '100%',
			width: '100%',
			top: 0,
			left: 0,
			border: 'none'
		});

		addEventListener("message", function(e) {
			if(e.data.auth) {
				$(iFrame).fadeOut(200, function() { $(this).remove(); });
				if (typeof callback === "function") callback();
			}
		});
	}

})(jQuery);