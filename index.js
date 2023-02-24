import { Configuration, OpenAIApi } from "openai";
import "dotenv/config";
import * as fs from "fs";
import { url } from "inspector";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

class Picture{
    id;
    landscape;
    descriptors;
    url;
    constructor(landscape, descriptors, id){
        this.id = id;
        this.landscape = landscape;
        this.descriptors = descriptors;
    }
    setURL(url){
        this.url = url
    }
    name(){
        
        const descriptorStr = this.descriptors.join(" ")
        return `${descriptorStr} ${this.landscape}`;
    }
    writeJSON(picsDir){
        const data = {
            id: this.id,
            landscape: this.landscape,
            descriptors: this.descriptors,
            url: this.url
        }
        fs.writeFileSync(picsDir+`/${this.id}.json`, JSON.stringify(data), {encoding: "utf-8"})
    }
}

async function main(){
    const picsDir = "./pics"
    // await genCSV("give me a csv of 20 landscape names", "landscapes");
    // await genCSV("give me a csv of 50 descriptors used for to identify funny landscapes", "descriptors");
    const pics = createRandPictures(10, picsDir);
    await genPics(pics);
    writePics(pics, "./pics")
    
}

function writePics(pics, picsDir){
    for(const pic of pics){
        pic.writeJSON(picsDir)
    }
}

async function genPics(pics){
    for(const pic of pics){
        const url = await genImage(pic.name());
        pic.setURL(url)
    }
    return pics
}

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
  }

//Not efficeint, i'm lazy
function getNextId(curCntr, picsDir){
    const filenames = fs.readdirSync(picsDir);
    return filenames.length + curCntr
}

function createRandPictures(numPics, picsDir){
    const landscapes = readCSV("landscapes");
    const descriptors = readCSV("descriptors")
    const pics = []
    let cntr = 0;
    while(cntr < numPics){
        const landscapeI = getRandomInt(landscapes.length);
        const desc1I = getRandomInt(descriptors.length);
        let desc2I;
        while(desc2I == undefined || descriptors[desc1I] == descriptors[desc2I]){
            desc2I = getRandomInt(descriptors.length);
        }
        const landscape = landscapes[landscapeI]
        const desc1 = descriptors[desc1I];
        const desc2 = descriptors[desc2I];
        pics.push(new Picture(landscape, [desc1, desc2], getNextId(cntr, picsDir)))
        cntr += 1;
    }
    return pics;
}

function readCSV(type){
    const basePath = `./${type}`
    const filenames = fs.readdirSync(basePath);
    const allType  = []
    for(const name of filenames){
        const data = fs.readFileSync(basePath+`/${name}`, "utf-8")
        const dataArr = data.split(",")
        allType.push(...dataArr)
    }
    return allType
}

async function genImage(picName){
    const resp = await openai.createImage({
        prompt: `pixelart highly detailed ${picName} landscape`,
        n: 1,
        size: "1024x1024"
    })

    const imgUrl = resp.data.data[0].url;
    return imgUrl;
}

async function genCSV(prompt, type){
    const filenames = fs.readdirSync(`./${type}`);
    const next = filenames.length;
    const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: prompt,
        temperature: 0.7,
        max_tokens: 256,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });

      const toRemove = ["\n", ".", " ", `"`]
      let data = response.data.choices[0].text
      for(const txt of toRemove){
        data = data.replaceAll(txt, "");
      }


      const dir = `./${type}/${next}.csv`
      fs.writeFileSync(dir, data, (err) => {
        if (err) throw err;
      })
      return data
}

main();