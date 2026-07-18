var fs = require("fs");
var c = fs.readFileSync("C:/Users/zhong/Documents/ChatStory/index.html", "utf8");

// 1. Add "psychologicalChange" to plotPoints schema in the prompt
var oldPlotSchema = '"plotPoints\\":[{\\"event\\":\\"事件描述\\",\\"chapter\\":\\"所在章节/位置\\",\\"type\\":\\"主线/支线/伏笔/转折\\",\\"significance\\":\\"重要性说明\\",\\"status\\":\\"已完成/进行中/待展开\\",\\"relatedChars\\":\\"涉及角色\\",\\"notes\\":\\"补充\\"}]';
var newPlotSchema = '"plotPoints\\":[{\\"event\\":\\"事件描述\\",\\"chapter\\":\\"所在章节/位置\\",\\"type\\":\\"主线/支线/伏笔/转折\\",\\"significance\\":\\"重要性说明\\",\\"status\\":\\"已完成/进行中/待展开\\",\\"relatedChars\\":\\"涉及角色\\",\\"psychologicalChange\\":\\"角色心理转变\\",\\"notes\\":\\"补充\\"}]';

// Need to replace ALL occurrences of the old plot schema (it appears in the chunkPrompt)
while (c.includes(oldPlotSchema)) {
  c = c.replace(oldPlotSchema, newPlotSchema);
}
console.log("Plot schema occurrences replaced:", (c.match(/psychologicalChange/g)||[]).length);

// 2. Add "calledBy" to characters schema
var oldCharSchema = '"characters\\":[{\\"name\\":\\"角色名\\",\\"alias\\":\\"别名/称号';
var newCharSchema = '"characters\\":[{\\"name\\":\\"角色名\\",\\"alias\\":\\"别名/称号\\",\\"calledBy\\":\\"其他角色对该角色的称呼';

while (c.includes(oldCharSchema)) {
  c = c.replace(oldCharSchema, newCharSchema);
}
console.log("Char schema occurrences replaced:", (c.match(/calledBy/g)||[]).length);

// 3. Update keyMap in renderLoreTab
var oldKeyMapPlot = 'plotPoints:{event:"事件",chapter:"章节",type:"类型",significance:"重要性",status:"状态",relatedChars:"涉及角色",notes:"补充"}';
var newKeyMapPlot = 'plotPoints:{event:"事件",chapter:"章节",type:"类型",significance:"重要性",status:"状态",relatedChars:"涉及角色",psychologicalChange:"心理转变",notes:"补充"}';
c = c.replace(oldKeyMapPlot, newKeyMapPlot);

var oldKeyMapChar = 'characters:{name:"角色名",alias:"别名/称号",role:"角色定位",gender:"性别",age:"年龄",appearance:"外貌",sexualFeatures:"性器官特征",fetish:"性癖",personality:"性格",background:"背景故事",relationships:"角色关系",sexPositions:"做爱姿势",arc:"角色弧光",notes:"补充"}';
var newKeyMapChar = 'characters:{name:"角色名",alias:"别名/称号",calledBy:"他人称呼",role:"角色定位",gender:"性别",age:"年龄",appearance:"外貌",sexualFeatures:"性器官特征",fetish:"性癖",personality:"性格",background:"背景故事",relationships:"角色关系",sexPositions:"做爱姿势",arc:"角色弧光",notes:"补充"}';
c = c.replace(oldKeyMapChar, newKeyMapChar);
console.log("keyMap updated:", c.includes("心理转变") && c.includes("他人称呼"));

fs.writeFileSync("C:/Users/zhong/Documents/ChatStory/index.html", c, "utf8");