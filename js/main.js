$(document).ready(function (e) {
	dev.Init();
});

var dev = {
	Init: function () {
		this.Slide.Init();
	},
	Slide: {
		Init: function () {
			this.Start();
		},
		Start: function () {
			var link = $(".cont").attr("src").toString();

			link = link.replace("https://","").replace("http://","");
			link = link.length < 22 ? link : link.substr(0, 22).toString() + "..";

			$(".isafarilink").html(link);

			var tabletLink = $(".itabletcont").attr("src").toString();

			tabletLink = tabletLink.replace("https://","").replace("http://","");
			tabletLink = tabletLink.length < 22 ? tabletLink : tabletLink.substr(0, 22).toString() + "..";

			$(".itabletsafarilink").html(tabletLink);

			var pcLink = $(".ccont").attr("src").toString();

			pcLink = pcLink.replace("https://","").replace("http://","");
			pcLink = pcLink.length < 22 ? pcLink : pcLink.substr(0, 22).toString() + "..";

			$(".ipcsafarilink").html(pcLink);
		},
	},
};	

////////////////////////////////////////