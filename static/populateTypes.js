window.onload = main;

function main() {

    let data = {
        "types":
            ["normal",
            "fighting",
            "flying",
            "poison",
            "ground",
            "rock",
            "bug",
            "ghost",
            "steel",
            "fire",
            "water",
            "grass",
            "electric",
            "psychic",
            "ice",
            "dragon",
            "dark",
            "fairy",
            "unknown",
            "shadow"
        ]
    };
    let optionslist = '';
    for(item in data["types"]) {
        optionslist += '<option value=\"'+data["types"][item]+'\">'+data["types"][item]+'</option>';
    }
    document.getElementById("type").innerHTML = optionslist;
}