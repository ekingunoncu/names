$( document ).ready(function() {
    let checkMobile = () => {
        let win = $(this); //this = window
        console.log(win.width());
        if (win.width() <= 700) {
            $( "#search" ).focus(() => {
                $("#search-area").css({ "position" : "absolute" , "top" : "20px" , "z-index" : "30"});
                $("#search-mobile-bg").css({ "display" : "block"});
            });
            $( "#search" ).focusout(() => {
                $("#search-area").css({ "position" : "unset" , "top" : "unset" , "z-index" : "30"});
                $("#search-mobile-bg").css({ "display" : "none"});
            });
        }
    }

    $(window).on('resize', function(){
        checkMobile();
    });

    checkMobile();
});
