const functions = require('firebase-functions');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const sqlite3 = require('sqlite3').verbose();
const usaData = require('./usa.js');
const db = new sqlite3.Database('./names.db');

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));

app.get('/health', ((req, res) => {
    res.send("I am alive.")
}));

app.get('/', ((req, res) => {
    res.render("index", {
        hasResult: false,
        title: "Search the uniqueness of your name!",
        meta: "Find out that how unique a name in the USA!",
        search_input_classes : "row container valign-wrapper center-align h-100",
    });
}));

app.post('/search', async (req, res) => {
    let maleNames = await getNationalNames(req.body.search, 'M');
    let femaleNames = await getNationalNames(req.body.search, 'F');
    let stateNames = await getStateNames(req.body.search);
    let preparedStateNames = await prepareStateNames(stateNames);
    let countObject = await getNameCounts(maleNames, femaleNames);
    res.render("index", {
        title: "Uniqueness of " + req.body.search + " in USA!",
        meta: "Find out that how unique " + req.body.search + " in the USA!, Uniqueness of " + req.body.search + " in USA!",
        nameData: JSON.stringify(preparedStateNames.nameData),
        name: req.body.search,
        hasResult: true,
        total: preparedStateNames.total,
        years: JSON.stringify(countObject.years),
        maleNameCounts: JSON.stringify(countObject.maleNameCounts),
        femaleNameCounts: JSON.stringify(countObject.femaleNameCounts),
        mainStates: JSON.stringify(usaData.mainStates),
        stateNames,
        search_input_classes : "row container"
    });
});

app.use(function(req, res, next){
    res.status(404);

    // respond with html page
    if (req.accepts('html')) {
        res.render('404', { url: req.url });
        return;
    }

    // respond with json
    if (req.accepts('json')) {
        res.send({ error: 'Not found' });
        return;
    }

    // default to plain-text. send()
    res.type('txt').send('Not found');
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
            if(!isMaleName){
                maleNameCounts.push(0);
            }
            femaleNames.forEach((femaleNameObj) => {
                if (femaleNameObj.Year === step) {
                    femaleNameCounts.push(femaleNameObj.Count);
                    isFemaleName = true;
                }
            });
            if(!isFemaleName){
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

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
exports.names = functions.https.onRequest(app);
