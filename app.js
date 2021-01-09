const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const sqlite3 = require('sqlite3').verbose();
const usaData = require('./usa.js');
const db = new sqlite3.Database('./names.db');
const port = 3000;
const NAME_COUNT = 355149899;

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(__dirname + '/public'));

app.get('/health', ((req, res) => {
    return res.send("I am alive.")
}));

app.get('/', (async (req, res) => {
    let bgText = await getRandomNamesAsHref(150);
    return res.render("index", {
        hasResult: false,
        bgText,
        title: "Search the uniqueness of your name!",
        meta: "Find out that how unique a name in the USA!",
        body_classes: "overflow-hidden",
        search_input_classes: "mt-40 search-input",
        search_button_classes: "search-button",
        footer_classes: "footer",
        name: "",
        notFound: false
    });
}));

app.get('/search', async (req, res) => {
    let bgText = await getRandomNamesAsHref(150);
    let maleNames = await getNationalNames(req.query.search, 'M');
    let femaleNames = await getNationalNames(req.query.search, 'F');
    if (maleNames.length === 0 && femaleNames.length === 0) {
        return res.render("index", {
            hasResult: false,
            title: "Search the uniqueness of your name!",
            meta: "Find out that how unique a name in the USA!",
            body_classes: "overflow-hidden",
            bgText,
            search_input_classes: "mt-40 search-input",
            search_button_classes: "search-button",
            footer_classes: "footer",
            notFound: true,
            name: req.query.search
        });
    }
    let stateNames = await getStateNames(req.query.search);
    if (stateNames.length === 0) {
        return res.render("index", {
            hasResult: false,
            bgText,
            title: "Search the uniqueness of your name!",
            meta: "Find out that how unique a name in the USA!",
            body_classes: "overflow-hidden",
            search_input_classes: "mt-40 search-input",
            search_button_classes: "search-button",
            footer_classes: "footer",
            notFound: true,
            name: req.query.search
        });
    }
    let preparedStateNames = await prepareStateNames(stateNames);
    let countObject = await getNameCounts(maleNames, femaleNames);
    return res.render("index", {
        title: "Uniqueness of " + req.query.search + " in USA!",
        meta: "Find out that how unique " + req.query.search + " in the USA!, Uniqueness of " + req.query.search + " in USA!",
        nameData: JSON.stringify(preparedStateNames.nameData),
        name: req.query.search,
        hasResult: true,
        total: preparedStateNames.total,
        years: JSON.stringify(countObject.years),
        maleNameCounts: JSON.stringify(countObject.maleNameCounts),
        femaleNameCounts: JSON.stringify(countObject.femaleNameCounts),
        mainStates: JSON.stringify(usaData.mainStates),
        stateNames,
        bgText,
        all: NAME_COUNT,
        body_classes: "overflow-unhidden",
        search_input_classes: "search-top-input",
        search_button_classes: "search-top-button",
        footer_classes: "footer-notfixed"
    });
});


const getNationalNames = async (name, gender) => {
    return new Promise((resolve, reject) => {
        let sql = "SELECT * FROM national_names WHERE Name = '" + name + "' COLLATE NOCASE AND Gender = '" + gender + "'";
        db.all(sql, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

const getStateNames = async (name) => {
    return new Promise((resolve, reject) => {
        let sql = "SELECT * FROM state_names WHERE Name = '" + name + "' COLLATE NOCASE";
        db.all(sql, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

const prepareStateNames = async (stateNames) => {
    return new Promise((resolve) => {
        let nameObjProcessed = 0;
        let nameData = [];
        let total = 0;
        if (stateNames instanceof Array) {
            stateNames.forEach((nameObj, index, array) => {
                nameData.push({
                    name: usaData.stateAbbreviations[nameObj.State],
                    value: nameObj.Count
                });
                total = total + nameObj.Count;
                nameObjProcessed++
                if (nameObjProcessed === array.length) {
                    resolve({nameData, total});
                }
            });
        }
    });
}

const getNameCounts = (maleNames, femaleNames) => {
    return new Promise((resolve) => {
        let years = [], maleNameCounts = [], femaleNameCounts = [];
        for (let step = 1880; step < 2020; step++) {
            let isMaleName = false, isFemaleName = false;
            maleNames.forEach((maleNameObj) => {
                if (maleNameObj.Year === step) {
                    maleNameCounts.push(maleNameObj.Count);
                    isMaleName = true;
                }
            });
            if (!isMaleName) {
                maleNameCounts.push(0);
            }
            femaleNames.forEach((femaleNameObj) => {
                if (femaleNameObj.Year === step) {
                    femaleNameCounts.push(femaleNameObj.Count);
                    isFemaleName = true;
                }
            });
            if (!isFemaleName) {
                femaleNameCounts.push(0);
            }
            years.push(step);
            if (step === 2019) {
                resolve({
                    years, maleNameCounts, femaleNameCounts
                });
            }
        }
    });
}

const getRandomNames = async (count) => {
    return new Promise((resolve, reject) => {
        let sql = "SELECT * FROM national_names WHERE id IN (SELECT id FROM national_names ORDER BY RANDOM() LIMIT " + count + ")";
        db.all(sql, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                let nameObjProcessed = 0;
                let bgText = "";
                rows.forEach((nameObj, index, array) => {
                    bgText = bgText + " " + nameObj.Name
                    nameObjProcessed++
                    if (nameObjProcessed === array.length) {
                        resolve(bgText);
                    }
                });
            }
        });
    });
}

const getRandomNamesAsHref = async (count) => {
    return new Promise(async (resolve, reject) => {
       let names = await getRandomRows(count);
       let namesHrefs = "";
       let nameObjProcessed = 0;
       names.forEach((name, index, array)=>{
           namesHrefs = "<a class='name-uniqueness-search-url' href=/search?search=" + name.Name + ">" + name.Name + "</a>" + namesHrefs;
           nameObjProcessed++
           if (nameObjProcessed === array.length) {
               resolve(namesHrefs);
           }
       });
    });
}

const getRandomRows = async (count) => {
    return new Promise((resolve, reject) => {
        let sql = "SELECT * FROM national_names WHERE id IN (SELECT id FROM national_names ORDER BY RANDOM() LIMIT " + count + ")";
        db.all(sql, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                let nameObjProcessed = 0;
                let bgText = "";
                resolve(rows);
            }
        });
    });
}

/*const getTotalNameCount = async () => {
    return new Promise((resolve, reject) => {
        let sql = "SELECT SUM(Count) from national_names";
        db.all(sql, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}*/

/*(async function () {
    let names = await getRandomRows(50000);
    names.forEach((name)=>{
        console.log(
            "<url>\n" +
            "  <loc>https://uniquenames.org/search?search=" + name.Name + "</loc>\n" +
            "  <lastmod>2021-01-09T13:08:45+00:00</lastmod>\n" +
            "</url>");
    });
})();*/

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`)
})
