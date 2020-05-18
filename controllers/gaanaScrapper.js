// importing required modules
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const useProxy = require('puppeteer-page-proxy');
const fs = require("fs");
const axios = require("axios");

// global instance of response object
let globalRes;

// sends all the responses
const sendResponse = (responseBody, responseType) => {
  switch (responseType) {
    case 0:
      globalRes.send({
        status: false,
        message: responseBody,
      });
      break;
    case 1:
      globalRes.send({
        status: true,
        playlistInformation: responseBody,
      });
      break;
    default:
      break;
  }
};

// logs console messages
const logConsole = (message) => {
  console.log(message);
};

// waits and fetches the html content of the url
const fetchHtmlContent = async (playlistUrl) => {
  try {
    // initializing puppeteer instance
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    // navigate to the playlist page
    const page = await browser.newPage();

    await page.setRequestInterception(true);

    await useProxy(page, 'http://49.248.17.94:8080');

    // navigating to playlist page and waiting till the page loads
    await page.goto(playlistUrl, {
      waitUntil: "networkidle2"
    });

    // getting html content of the page
    const html = await page.content();

    // close the page
    browser.close();

    // returning the html content
    return html;
  } catch (error) {
    logConsole("Puppeteer Error: ", error);
    return null;
  }
};

// get song list through non-film album method
const getSongsListNonFilmStructure = async ($) => {
  try {
    // holds the list of song titles
    const songsList = [];
    // fetching all Divs containing all songs
    const songDivs = $(".content-container").find(".track_npqitemdetail");
    // iterating through each div
    songDivs.each((i, songDiv) => {
      // constains instance of each song
      let songObj = {};
      // getting the song title
      songObj["title"] = $(songDiv).find("span").text();
      // cycling through the artists and getting the first one
      $(songDiv)
        .find("a")
        .each(async (i, artistAnchor) => {
          songObj["artist"] = await $(artistAnchor).text();
        });
      // checking if the audio artist is undefined, which would mean this is a movie album and thus, the artist name is in different
      songsList.push(songObj);
    });
    // returning songsList
    return songsList;
  } catch (error) {
    logConsole("Error in getSongsListNonFilmStructure: " + error);
    return null;
  }
};

// get song list through film album method
const getSongsListFilmStructure = async ($) => {
  try {
    // holds the list of song titles
    const songsList = [];
    // getting to the unordered list containing all songs
    const allSongUL = await $(".content-container")
      .find(".s_c")
      .find("ul")
      .toArray()[1];

    // finding all the list items (songs in the unordered list)
    const songsListItems = await $(allSongUL)
      .find('li[draggable="true"]')
      .toArray();

    // iterating through each song list item which contains multiple other list items
    for (const multiListItems of songsListItems) {
      // constains instance of each song
      let songObj = {};
      // getting to the list item containing the song details
      let songDetailLstItem = await $(multiListItems).find("li").toArray()[2];
      // getting the song title stored in the 3rd list item
      songObj["title"] = await $(
        $(songDetailLstItem).find("a").toArray()[0]
      ).text();
      // getting the song artist stored in the 3rd list item
      songObj["artist"] = await $(
        $(songDetailLstItem).find("a").toArray()[1]
      ).text();

      // pushing song object into list
      songsList.push(songObj);
    }
    // returning the song lst
    return songsList;
  } catch (err) {
    logConsole("Error in getSongsListFilmStructure: " + error);
    return null;
  }
};

// gets the playlist information from the html content
const getPlaylistInformation = async (htmlContent) => {
  try {
    // loading html content into cheerio
    const $ = cheerio.load(htmlContent);
    // fetching the album title
    let albumTitle = $("._d_tp_det").find("h1").text();
    // checking if albumTitle returned empty (if this is a trending list)
    if (albumTitle.length === 0) albumTitle = $(".trendingtitle").text();
    // checking if the albumTitle is still empty (if this is a movie album)
    if (albumTitle.length === 0) albumTitle = $(".album_songheading").text();

    // try getting the song list through non-film album method
    let songsList = await getSongsListNonFilmStructure($);

    // checking if the artists have been fetched (if the album is a film album)
    if (songsList[0]["artist"] === undefined)
      songsList = await getSongsListFilmStructure($);

    // creating album object
    const albumObj = {
      albumTitle: albumTitle
    };
    // pushing album songs into albumObj
    albumObj["songsList"] = songsList;
    // returning data
    return albumObj;
  } catch (error) {
    logConsole("Error in getPlaylistInformation: " + error);
    return null;
  }
};

// fetches the list of proxy IPs from the ip hosting site
const getListofProxies = async (proxyIPHost) => {
  try {
    // initiating request to get the proxy IPs
    const requestResponse = await axios.get(proxyIPHost);
    // check if the valid response if received
    if (requestResponse.status === 200) {
      // getting the html data
      const responseData = requestResponse.data;

      // loading html content into cheerio
      const $ = cheerio.load(responseData);

      // fetch the table containing all the IP address values
      const pageBody = $($($('body').find('table').toArray()[1]).find('table').toArray()[0]).find('tr');

      fs.writeFile("sample.html", pageBody, (err) => {
        if (err) logConsole(err);
      });

    } else {
      logConsole("Not getting valid content from the ip hosting website");
      return null;
    }
  } catch (error) {
    logConsole("Error in getting the list of proxies: " + error);
    return null;
  }

};

// gets the list of songs from playlist url
module.exports.getGaanaSongs = async (req, res, next) => {

  // holds the proxy IP hosting site
  const proxyIPHost = "http://spys.one/free-proxy-list/IN/";

  try {
    // setting global instance of res
    globalRes = res;

    // getting the playlist url
    const playlistUrl = req.query.playlisturl;
    logConsole("Recieved playlist url: " + playlistUrl);

    // fetches the list of proxy IPs from the ip hosting site
    const listOfProxies = await getListofProxies(proxyIPHost);

    sendResponse("Completed", 0);

    // // checking if playlist has been passed
    // if (playlistUrl !== null) {
    //   // fetching html content for the playlist url
    //   const htmlContent = await fetchHtmlContent(playlistUrl);
    //   logConsole("Fetched Html content");
    //   // checking if html content has been recieved
    //   if (htmlContent !== null) {
    //     // get playlist information from the html content
    //     const playlistInformation = await getPlaylistInformation(htmlContent);
    //     logConsole("Got playlist information");
    //     // checking if the songList has been returned
    //     if (playlistInformation !== null) {
    //       logConsole("Sent response to client");
    //       // sending response to client
    //       sendResponse(playlistInformation, 1);
    //     } else {
    //       logConsole("Could not get playlist information from the url");
    //       // sending response to client
    //       sendResponse("Could not net playtlist information from the url", 0);
    //     }
    //   } else {
    //     logConsole("No html content recieved for the playlist url");
    //     sendResponse("No html content recieved for the playlist url", 0);
    //   }
    // } else {
    //   logConsole("No playlist url recieved");
    //   sendResponse("No playlist url recieved", 0);
    // }
  } catch (error) {
    console.log("Main method error: ", error);
    sendResponse("Internal server error: " + error, 0);
  }
};