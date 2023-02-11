const express = require("express");
const bodyParser = require("body-parser");
const { channelId, videoId } = require("@gonetone/get-youtube-id-by-url");
const ytcm = require("@freetube/yt-comment-scraper");
const ytch = require("yt-channel-info");
const numeral = require("numeral");
const { Client } = require("youtubei");
const { videoInfo } = require("yt-getvideos");
const YouTube = require("youtube-sr").default;
const { categories } = require("./youtubeCategories.json");
const ytScraper = require("yt-scraper");
const request = require("request");
const cors = require("cors");
// const { GetVideoInfo } = require("youtube.land");
// const yts = require("youtube-search-without-api-key");
// const ytsr = require("better-ytsr");
// const { getVideo, getPlaylist, search } = require("@fabricio-191/youtube");
// const iyt = require("iyoutube");
// const { Innertube } = require("youtubei.js");
// const { getVideoInfo } = require("youtube-dlsr");

const app = express();
const port = 9090;
const jsonParser = bodyParser.json();
const youtube = new Client();

app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

// ytScraper
//   .videoInfo("gz2Xj3sSUtM", {
//     includeRawData: true,
//   })
//   .then((data) => console.log(data, "Data"));

// GetVideoInfo("I1qsF0WQy8c").then((data) => console.log(data, "Video Info"));
// const YT = Innertube.create();

// getVideoInfo("I1qsF0WQy8c").then((data) => {
//   console.log(data, "Get Video Info");
// });

// YT.then((data) => {
//   data
//     .getBasicInfo("I1qsF0WQy8c")
//     .then((video) => console.log(video, "Video Data"));
// });

// async function getSearchData(video) {
//   await yts.search(video).then((data) => console.log(data, "Video Data"));
// }
// getSearchData("I1qsF0WQy8c");

// ytsr("I1qsF0WQy8c").then((data) =>
//   console.log(data?.items?.[0]?.author, "YTSR Data")
// );

// getVideo("gz2Xj3sSUtM").then((data) => console.log(data, "Get Video Data"));

/* ---------------------------------------------- GLOBAL FUNCTIONS ---------------------------------------------- */
// Get Channel Info Function
async function getChannelInfo(channelId) {
  let channelInfo;
  let payload = {
    channelId: channelId,
    channelIdType: 0,
  };
  await ytch.getChannelInfo(payload).then((response) => {
    if (!response?.alertMessage) {
      channelInfo = {
        id: response?.authorId,
        name: response?.author,
        url: response?.authorUrl,
        description: response?.description,
        thumbnails: response?.authorThumbnails,
        subscribers: response?.subscriberText,
        isVerified: response?.isVerified,
        isOfficialArtist: response?.isOfficialArtist,
        relatedChannels: response?.relatedChannels,
        tags: response?.tags,
        links: response?.channelLinks,
        idType: response?.channelIdType,
      };
    } else {
      console.log("Channel not found");
    }
  });
  return channelInfo;
}

// Get Videos from channel
async function getVideosFromChannel(channelId) {
  let payload = {
    channelId: channelId,
    sortBy: "newest",
  };
  let output = await ytch.getChannelVideos(payload);
  return output;
}

//Get More Videos from Channel
async function getMoreVideosFromChannel(token) {
  let payload = {
    continuation: token,
  };
  let output = await ytch.getChannelVideosMore(payload);
  return output;
}

// Get Channel Id from Youtube URL's
// Supported formats
// https://www.youtube.com/channel/abc
// https://www.youtube.com/c/abc
// https://www.youtube.com/user/abc
async function getChannelIdFromURL(url) {
  let channelID;
  await channelId(url).then((id) => {
    channelID = id;
  });
  return channelID;
}

// Get Video Id from Youtube URL's
// Supported formats
// https://www.youtube.com/watch?v=xxxxxxxxxxx
// https://youtu.be/xxxxxxxxxxx
async function getVideoIdFromURL(url) {
  let videoID;
  await videoId(url).then((id) => {
    videoID = id;
  });
  return videoID;
}

/* --------------------------------------------- IMPLEMENTING API'S ---------------------------------------------- */

// Home URL
app.get("/", (req, res) => {
  res.send("Youtube Scraping using Node.js");
});

// Get Youtube Channel Id from URL
// Send Youtube URL to get the Channel ID
app.post("/get-channel-id", jsonParser, async (req, res) => {
  let id = req.body.id;
  if (res.statusCode === 200) {
    await getChannelIdFromURL(id).then((response) => {
      res.send({
        channelID: response,
      });
    });
  } else {
    res.send(`Eror, Status Code: ${res.statusCode}`);
  }
});

// Get Youtube Video Id from URL
// Send Youtube Video URL to get the Video Id
app.post("/get-video-id", jsonParser, async (req, res) => {
  let url = req.body.url;
  if (res.statusCode === 200) {
    await getVideoIdFromURL(url)
      .then((response) => {
        res.send({
          videoID: response,
        });
      })
      .catch((err) => {
        res.send(err);
      });
  } else {
    res.send(`Error, Status Code: ${res.statusCode}`);
  }
});

// Youtube Individual Video Data
// Send Video Id to get the Data
app.get("/video-info/:videoId", async (req, res) => {
  const video = await youtube.getVideo(req.params.videoId);
  const payload = {
    videoId: req.params.videoId,
    sortByNewest: true,
  };
  let videodata, videoinfo;
  YouTube.getVideo(
    `https://www.youtube.com/watch?v=${req.params.videoId}`
  ).then((data) => (videodata = data));
  videoInfo(req.params.videoId).then((data) => {
    videoinfo = data;
  });
  let comments;
  await ytcm
    .getComments(payload)
    .then((data) => {
      comments =
        data?.total > 1000 ? numeral(data?.total).format("0.0a") : data?.total;
    })
    .catch((error) => {
      console.log(error);
    });
  let cateroryId = categories?.find(
    (cat) => cat?.title === videoinfo?.category
  );
  if (res.statusCode === 200) {
    let output = {
      id: req.params.videoId,
      title: video?.title,
      description: video?.description,
      duration: video?.duration,
      shorts: videodata?.shorts,
      publishedAt: videoinfo?.publishedAt,
      category: videoinfo?.category,
      categoryId: cateroryId?.id,
      videoURL: videoinfo?.embed?.flashUrl,
      likes:
        video?.likeCount > 1000
          ? numeral(video?.likeCount).format("0.0a")
          : video?.likeCount,
      views:
        video?.viewCount > 1000
          ? numeral(video?.viewCount).format("0.0a")
          : video?.viewCount,
      comments: comments,
      watching: video?.watchingCount || "N/A",
      isLiveContent: video?.isLiveContent,
      thumbnails: video?.thumbnails,
      tags: video?.tags,
      uploadedDate: video?.uploadDate,
      uploadedChannelData: {
        channelId: video?.channel?.id,
        channelName: video?.channel?.name,
      },
    };
    res.send(output);
  } else {
    res.send("Error");
  }
});

// Get Youtube Channel Info
// Send Channel Id to get the Data
app.get("/channel-info/:channelId", async (req, res) => {
  if (res.statusCode === 200) {
    let channelId = req.params.channelId;
    getChannelInfo(channelId)
      .then((response) => {
        res.send(response);
      })
      .catch((error) => {
        res.send(error);
      });
  }
});

// Get Youtube Channel Videos Data
// Send Channel Id to get the Data
app.get("/channel-videos-data/:channelId/:count", async (req, res) => {
  let channelID = req.params.channelId;
  let count = req.params.count;
  let moreVids = true;
  let token = "";
  let allVids = [];
  let page = await getVideosFromChannel(channelID);
  let vids = page?.items;
  token = page?.continuation;
  vids.map((v) => allVids.push(v));
  while (moreVids && token !== null) {
    try {
      let data = await getMoreVideosFromChannel(token);
      let vids = data?.items;
      vids.map((v) => allVids.push(v));
      token = data?.continuation;
      token !== null && allVids.length < count
        ? (moreVids = true)
        : (moreVids = false);
    } catch (e) {
      console.log(e, "Error");
    }
  }
  if (allVids.length < count) {
    res.send(allVids);
  } else {
    res.send(allVids.slice(0, count));
  }
});

// Listening to Port
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
