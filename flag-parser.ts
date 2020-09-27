const a = `### 🚩 Flags idea

|Flag| R |Reason|Without|
|:--|:-:|:--|:--|
| 🚧 \`--unstable\` | * | Needed for Cliffy to work | 🚫 Wont start |
| 🌐 \`--allow-net\` | * | To fetch data from the repos | 🚫 Wont start |
| 🔍 \`--allow-read\` |  | Needed for cache info | Wont be able to browse cached |
| 💾 \`--allow-write\` |  | Save favourites | Wont be able to save favourites |
| ⏱ \`--allow-hrtime\` |  | Allows precise benchmarking | Loss of accuracy |
| ⚠ \`--allow-run\` |  | Needed for feature x | Feature wont be available |
| 🔮 \`--allow-all\` |  | It should never be required | You have to type out flags |
| 🧭 \`--allow-env\` |  | Needed to access your ENV |  |
| 🧩 \`--allow-plugin\` |  | Needed to run RUST plugins | no automatation |`;

// console.log(a.match(/\| .* \`\-\-[^\`]* \|/g));

const flags = a.match(/\| .* \`--[^`]*\` \| [ \*]* \|/g);
console.log(flags);

const FtoEMap: any = {
    "--unstable": '🚧',
     "--allow-net": "🌐",
     "--allow-read": "🔍",
     "--allow-write": "💾",
     "--allow-hrtime": "⏱",
     "--allow-run": "⚠",
     "--allow-all": "🔮",
     "--allow-env": "🧭",
     "--allow-plugin": "🧩",
}

const re = new RegExp(/\| .* \`(--[^`]*)\` \| ([ \*]*) \|/g);

var result;
const required = [];
const optional = [];
while((result = re.exec(a)) !== null) {
    // console.log(result);
    if(result[2].includes('*')) {
        required.push(FtoEMap[result[1]]);
    } else {
        optional.push(FtoEMap[result[1]]);
    }
}

console.log(`Flags: ${required.join(" ")}${optional.length? ` (${optional.join(" ")})`: ""}`);

// console.log(flags?.map(f => f.includes('*') ? f : `(${f})`).join(', '));
// console.log(re);