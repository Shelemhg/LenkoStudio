var song = document.getElementById("mySong");
function Play() { 
    if(song.paused == true){
        song.play();
        // document.getElementById('section-1').style.display = "none";
    }
    // else{
    //     song.pause();
    // }
}       


let section1 = document.getElementById('section-1');
var video = document.getElementById("myVideo");
document.getElementById('section-1').onclick = function(){
    
    section1.classList.toggle('fade');
    video.play();
    document.getElementById('myVideo').style.filter = "none";
    document.getElementById('home-btns-wrapper').style.opacity = "1";
}


