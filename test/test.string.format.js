require("../lib/string-format.js");

var context = {
    stationIndex: 13,
    plan: {
        site:{
            id: 3,
        },
        platform: {
            id: 0,
        },
        planNumber: 8,
        planVersion: "CHARLIE",
    },
};
var template = "{plan.site.id}_{plan.platform.id}{plan.planNumber:-03.2f}{plan.planVersion}_STN{stationIndex}";

console.log( template.format(context) );
