var parser = require('luaparse');
var fs = require('fs');

function getAllFiles(path) {
    var list = [];
    fs.readdirSync(path).forEach(e => {
        if (fs.lstatSync(path + e).isFile()) {
            list.push(path + e);
        } else {
            list = [...list, ...getAllFiles(path + e + '/')];
        }
    });
    return list;
}

// https://stackoverflow.com/questions/1068834/object-comparison-in-javascript
Object.equals = function (x, y) {
    if (x === y)
        return true;
    // if both x and y are null or undefined and exactly the same

    if (!(x instanceof Object) || !(y instanceof Object))
        return false;
    // if they are not strictly equal, they both need to be Objects

    if (x.constructor !== y.constructor)
        return false;
    // they must have the exact same prototype chain, the closest we can do is
    // test there constructor.

    for (var p in x) {
        if (!x.hasOwnProperty(p))
            continue;
        // other properties were tested using x.constructor === y.constructor

        if (!y.hasOwnProperty(p))
            return false;
        // allows to compare x[ p ] and y[ p ] when set to undefined

        if (x[p] === y[p])
            continue;
        // if they have the same strict value or identity then they are equal

        if (typeof(x[p]) !== "object")
            return false;
        // Numbers, Strings, Functions, Booleans must be strictly equal

        if (!Object.equals(x[p], y[p]))
            return false;
        // Objects and Arrays must be tested recursively
    }

    for (p in y) {
        if (y.hasOwnProperty(p) && !x.hasOwnProperty(p))
            return false;
        // allows x[ p ] to be set to undefined
    }
    return true;
}

var MOD_PATH = './mods/'; {
    var KOREAN_PATH = MOD_PATH + 'pykoreanlocale_1.1.13/locale/ko/';
    var KOREAN_DATA = {};
    var KOREAN_FILES = fs.readdirSync(KOREAN_PATH).forEach(e => KOREAN_DATA[e] = extractLanguageForm(fs.readFileSync(KOREAN_PATH + e, 'utf8')));
    var KOREAN_RECIPE_NAME = {};
    var KOREAN_ITEM_NAME = {};
    var KOREAN_ENTITY_NAME = {};
    var KOREAN_FLUID_NAME = {};
    var KOREAN_EQUIPMENT_NAME = {};
    var KOREAN_TECHNOLOGY_NAME = {};
    var KOREAN_ITEM_DESCRIPTION = {};
    var KOREAN_RECIPE_DESCRIPTION = {};
    var KOREAN_ENTITY_DESCRIPTION = {};
    for (let[k, v]of Object.entries(KOREAN_DATA)) {
        KOREAN_TECHNOLOGY_NAME = {
            ...KOREAN_TECHNOLOGY_NAME,
            ...v['technology-name']
        };

        KOREAN_EQUIPMENT_NAME = {
            ...KOREAN_EQUIPMENT_NAME,
            ...v['equipment-name']
        };
        KOREAN_RECIPE_NAME = {
            ...KOREAN_RECIPE_NAME,
            ...v['recipe-name']
        };
        KOREAN_ITEM_NAME = {
            ...KOREAN_ITEM_NAME,
            ...v['item-name']
        };
        KOREAN_ENTITY_NAME = {
            ...KOREAN_ENTITY_NAME,
            ...v['entity-name']
        };
        KOREAN_FLUID_NAME = {
            ...KOREAN_FLUID_NAME,
            ...v['fluid-name']
        };
        KOREAN_ITEM_DESCRIPTION = {
            ...KOREAN_ITEM_DESCRIPTION,
            ...v['item-description']
        };
        KOREAN_RECIPE_DESCRIPTION = {
            ...KOREAN_RECIPE_DESCRIPTION,
            ...v['recipe-description']
        };
        KOREAN_ENTITY_DESCRIPTION = {
            ...KOREAN_ENTITY_DESCRIPTION,
            ...v['entity-description']
        };
    }
}

var TARGET_FILES = getAllFiles(MOD_PATH).filter(e => e.endsWith('.lua'));

var RECIPE_MAP = {};
var RECIPE = [];
var RECIPE_UPDATE = [];
var RECIPE_UPDATE_MAP = [];
var FLUID_MAP = {};
var FLUID = [];

var PROCESS_LOG = '';
TARGET_FILES.forEach(f => {
    var s = fs.readFileSync(f, 'utf8');
    try {
        var FORM1_RECIPE = extractForm1(s, 'RECIPE');
        FORM1_RECIPE.forEach(e => {
            var oE = RECIPE_MAP[e.name];
            if (!e.name) {
                PROCESS_LOG += `[FORM1_RECIPE] (NAME UNDEFINED):  ${JSON.stringify(e)}\n`;
                return;
            }
            if (!oE) {
                RECIPE_MAP[e.name] = e;
                RECIPE.push(e);
            } else {
                if (Object.equals(oE, e)) {
                    PROCESS_LOG += `[FORM1_RECIPE] (DUPLICATED WARN):  ${e.name}\n`;
                } else {
                    PROCESS_LOG += `[FORM1_RECIPE] (EXIST KEY):  ${e.name}`;
                    if (JSON.stringify(e).length > JSON.stringify(oE).length) {
                        RECIPE_MAP[e.name] = e;
                        PROCESS_LOG += ` => OVERWRITED`;
                    }
                    PROCESS_LOG += `\n`;
                    RECIPE.push(e);
                }

            }
        });
    } catch (e) {
        PROCESS_LOG += `[FORM1_RECIPE] (ERROR):  ${f}\n`;
    }
});

TARGET_FILES.forEach(f => {
    var s = fs.readFileSync(f, 'utf8');
    try {
        var FORM2_RECIPE = extractForm2(s, 'RECIPE');
        if (FORM2_RECIPE.error) {
            PROCESS_LOG += `[FORM2_RECIPE] (ERROR):  ${FORM2_RECIPE.error}\n`;
        }
        RECIPE_UPDATE = [...RECIPE_UPDATE, ...FORM2_RECIPE];
    } catch (e) {
        PROCESS_LOG += `[FORM2_RECIPE] (ERROR):  ${f}\n`;
    }
});

for (var k of RECIPE_UPDATE) {
    var isAlready = false;
    for (var t of RECIPE) {
        if (k.target === t.name) {
            isAlready = true;
        }
    }
    if (!isAlready) {
        RECIPE.push({
            name: k.target,
            type: 'recipe',
            ingredients: [{
                    name: '기존 조합법 재료',
                    amount: 1
                }
            ],
            results: [{
                    name: k.target,
                    amount: 1
                }
            ],
            isAutoCreated: true,
            flag: []
        });

    }
}



var GLOBAL_REPLACER = [{
        name: 'replace_ingredient',
        value: ['iron-gear-wheel', 'small-parts-01']
    }
];

function getUpdateFlag(n) {
    var flagList = [];
    RECIPE_UPDATE.filter(e => e.target === n).map(e => e.flag).forEach(e => {
        flagList = [...flagList, ...e];
    });
    return flagList;
}
var l = [];
for (var k of RECIPE) {
    var n = getKoreanNameR(k.name);
    var flag = [...k.flag, ...getUpdateFlag(k.name), ...GLOBAL_REPLACER]

    if (!k.ingredients) {
        k.ingredients = [];
    } else {
        k.ingredients = k.ingredients.map(e => {
            if (Array.isArray(e)) {
                return {
                    name: e[0],
                    amount: e[1]
                };

            } else {
                return e;
            }
        })
    }
    if (!k.results) {
        k.results = [];
    } else {
        k.results = k.results.map(e => {
            if (Array.isArray(e)) {
                return {
                    name: e[0],
                    amount: e[1]
                };

            } else {
                return e;
            }
        })
    }
    var t = '';
    flag.forEach(e => {
        if (e.name === 'add_ingredient') {
            if (Array.isArray(e.value)) {
                e.value = {
                    name: e.value[0],
                    amount: e.value[1]
                }

            } else if (typeof e.value === 'string') {
                e.value = {
                    name: e.value,
                    amount: 1
                }
            }

            k.ingredients.push(e.value);
        } else if (e.name === 'replace_ingredient') {
            if (k.isAutoCreated) {
                k.ingredients.push({
                    name: `조합법 변경: ${getKoreanNameI(e.value[0])} → ${getKoreanNameI(e.value[1])} `,
                    amount: '?',
                    deleteAmount: true
                });
            } else {
                k.ingredients.map(l => {
                    if (l.name == e.value[0]) {
                        l.name = e.value[1];
                    }
                })
            }
        } else if (e.name == 'remove_ingredient') {

            if (k.isAutoCreated) {
                k.ingredients.push({
                    name: `조합법 삭제: ${getKoreanNameI(e.value)} `,
                    amount: '?',
                    deleteAmount: true
                });
            } else {
                k.ingredients = k.ingredients.filter(l => l.name != e.value);
            }

        } else if (e.name == 'add_unlock') {
            if (Array.isArray(e.value)) {
                t += e.value.map(e => `:${getKoreanTechnology(e)}`).join('');
            } else {
                t += `:${getKoreanTechnology(e.value)}`;
            }
        }
    });
    var i = '없음';

    if (k.ingredients) {
        i = k.ingredients.map(e => {
            var amountText = `×${e.amount}`;
            if (e.amount_max) {
                amountText = `${e.amount_min}~${e.amount_max}`;
            }
            if (e.probability) {
                amountText += ` (${Math.floor(e.probability * 10000) / 100}%)`
            }
            if (e.deleteAmount) {
                amountText = '';
            }
            return ` ${getKoreanNameI(e.name)}${amountText}`;
        }).join('\n');
    }

    var r = '없음';
    var d = '';

    if (k.results) {
        r = k.results.map(e => {
            var amountText = `×${e.amount}`;
            if (e.amount_max) {
                amountText = `×${e.amount_min}~${e.amount_max}`;
            }
            if (e.probability) {
                amountText += ` (${Math.floor(e.probability * 10000) / 100}%)`
            }
            if (e.deleteAmount) {
                amountText = '';
            }
            return ` ${getKoreanNameI(e.name)}${amountText}`;
        }).join('\n');
        if (n === k.name && k.results.length === 1) {
            if (Array.isArray(k.results[0])) {
                n = getKoreanNameI(k.results[0]) + ' (' + n + ')';
                d = getKoreanDescriptionI(k.results[0])
            } else {
                n = getKoreanNameI(k.results[0].name) + ' (' + n + ')';
                d = getKoreanDescriptionI(k.results[0].name)
            }
        } else {

            d = getKoreanDescriptionR(k.name);
            if (n !== k.name) {
                n = n + ' (' + k.name + ')';
            }

        }
    }

    l.push(`[${n}]${t}${d ? '         ···' + d : ''}\n재료\n${i}\n결과\n${r}`);
}

fs.writeFileSync('./PyALKoreanRecipeV15.txt', l.join('\n\n'), 'utf8');

function getKoreanTechnology(n) {
    var t = KOREAN_TECHNOLOGY_NAME[n];
    if (t) {
        return t;
    } else {
        try {
            t = KOREAN_TECHNOLOGY_NAME[n.split('-').reverse().slice(1).reverse().join('-')];
            if (t) {
                return t + ' ' + n.split('-').reverse()[0];
            }
        } catch (e) {}

        return n;
    }
}

function getKoreanDescriptionR(n) {
    var r = KOREAN_RECIPE_DESCRIPTION[n];
    var e = KOREAN_ENTITY_DESCRIPTION[n];
    if (r) {
        return r;
    } else if (e) {
        return e;
    } else {
        return null;
    }
}
function getKoreanDescriptionI(n) {
    var i = KOREAN_ITEM_DESCRIPTION[n];
    var e = KOREAN_ENTITY_DESCRIPTION[n];
    if (i) {
        return i;
    } else if (e) {
        return e;
    } else {
        return null;
    }
}
function getKoreanNameR(n) {
    var r = KOREAN_RECIPE_NAME[n];
    var i = KOREAN_ITEM_NAME[n];
    var e = KOREAN_ENTITY_NAME[n];
    var f = KOREAN_FLUID_NAME[n];
    var q = KOREAN_EQUIPMENT_NAME[n];
    if (r) {
        return r;
    } else if (i) {
        return i;
    } else if (e) {
        return e;
    } else if (f) {
        return f;
    } else if (q) {
        return q;
    } else {
        return n;
    }
}
function getKoreanNameI(n) {
    var r = KOREAN_RECIPE_NAME[n];
    var i = KOREAN_ITEM_NAME[n];
    var e = KOREAN_ENTITY_NAME[n];
    var f = KOREAN_FLUID_NAME[n];
    var q = KOREAN_EQUIPMENT_NAME[n];

    if (i) {
        return i;
    } else if (f) {
        return f;
    } else if (e) {
        return e;
    } else if (r) {
        return r;
    } else if (q) {
        return q;
    } else {
        return n;
    }
}
function extractLanguageForm(str) {
    var sCValue = str.split(/^\[.+?\]$/gm).slice(1);
    var sCName = str.match(/(?<=^\[).+?(?=\]$)/gm);
    var obj = {};
    for (var i = 0; i < sCName.length; i++) {
        var n = sCName[i];
        obj[n] = {};
        var v = sCValue[i].split(/[\r\n]/g);
        for (var u of v) {
            var vS = u.split('=');
            if (vS[0]) {
                obj[n][vS[0]] = vS.slice(1).join(' ');
            }
        }
    }
    return obj;
}

function extractForm2(str, bindName) {
    var list = [];
    list.error = '';
    var e = new RegExp('(?<=' + bindName + '\\().+?(?=\\))', 'g');
    while ((m = e.exec(str)) != null) {
        try {
            var i = m.index;
            var t = i;
            for (; i < str.length; i++) {
                var c = str.charAt(i);
                if (c === '\n' || c === '\r') {
                    break;
                }
            }
            var flag = str.substring(t + 1, i);
            var fArr = [];
            var fKey = flag.match(/(?<=\:).+?(?=\()/g);
            var fValue = flag.match(/(?<=\().+?(?=\))/g);
            if (fKey && fValue) {
                for (var f = 0; f < fKey.length; f++) {
                    var vv = fValue[f];
                    var kk = fKey[f];
                    var to = {};
                    to.name = kk;
                    if (vv.startsWith('{')) {
                        to.value = parseLuaTableFromRawObject(parser.parse("LITERAL_PARSE" + vv));
                    } else {
                        var eV = eval('[' + vv + ']');
                        if (eV.length == 1) {
                            to.value = eV[0];
                        } else {
                            to.value = eV;
                        }
                    }
                    fArr.push(to);

                }
                list.push({
                    target: eval(m[0]),
                    flag: fArr
                });
            }
        } catch (e) {
            list.error += '(ParseError) at ' + m.index + ' index\n';
        }

    }
    return list;

}

function extractForm1(str, bindName) {
    var list = [];
    var e = new RegExp(bindName + '[ \r\n]+{', 'g');
    while ((m = e.exec(str)) != null) {
        var l = 0;
        var r = 0;
        for (var i = m.index; i < str.length; i++) {
            var c = str.charAt(i);
            if (c === '{') {
                l++;
            } else if (c === '}') {
                r++;
            }
            if (l > 0 && r > 0 && l === r) {
                var t = i;

                for (; i < str.length; i++) {
                    c = str.charAt(i);
                    if (c === '\n' || c === '\r') {
                        break;
                    }
                }
                var raw = str.substring(m.index, t + 1);
                raw = parseLuaTableFromRawObject(parser.parse(raw));

                var flag = str.substring(t + 1, i);
                var fArr = [];
                var fKey = flag.match(/(?<=\:).+?(?=\()/g);
                var fValue = flag.match(/(?<=\().+?(?=\))/g);
                if (fKey && fValue) {
                    for (var f = 0; f < fKey.length; f++) {
                        var vv = fValue[f];
                        var kk = fKey[f];
                        var to = {};
                        to.name = kk;
                        if (vv.startsWith('{')) {
                            to.value = parseLuaTableFromRawObject(parser.parse("LITERAL_PARSE" + vv));
                        } else {
                            var eV = eval('[' + vv + ']');
                            if (eV.length == 1) {
                                to.value = eV[0];
                            } else {
                                to.value = eV;
                            }
                        }
                        fArr.push(to);

                    }

                }
                raw.flag = fArr;
                list.push(raw);
                break;
            }
        }
    }
    return list;
}

function parseLuaTableFromRawObject(o) {
    return parseLuaTable(extractTable(o));
}

function extractTable(o) {
    return o.body[0].expression.arguments;
}
function setTypeValue(f, r, k) {
    switch (f.value.type) {
    case 'NumericLiteral':
    case 'BooleanLiteral':
        r[k] = f.value.value;
        break;
    case 'StringLiteral':
        r[k] = eval(f.value.raw);
        break;
    case 'TableConstructorExpression':
        r[k] = parseLuaTable(f.value);
        break;
    }
}

function isArrayObject(r) {
    var k = Object.keys(r);
    for (var i = 0; i < k.length; i++) {
        if (k[i] !== i.toString()) {
            return false;
        }
    }
    return true;
}

function parseLuaTable(o) {
    var r = {};
    var i = 0;
    if (o.fields) {
        for (var f of o.fields) {
            if (f.type === 'TableKeyString' && f.key.type === 'Identifier') {
                setTypeValue(f, r, f.key.name);
            } else if (f.type === 'TableValue') {
                setTypeValue(f, r, i++);
            }
        }
    }
    if (isArrayObject(r)) {
        return Object.values(r);
    }
    return r;
}
