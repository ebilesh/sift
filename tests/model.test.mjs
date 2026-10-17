import {test} from 'node:test';
import assert from 'node:assert/strict';
import {category,bytes,filterFiles,demo} from '../src/model.ts';
test('categories distinguish folders, media, archives and applications',()=>{assert.equal(category(demo[0]),'Documents');assert.equal(category(demo[2]),'Video');assert.equal(category(demo[9]),'Folders');assert.equal(category(demo[11]),'Applications');});
test('filter combines case insensitive name, type and size',()=>{assert.equal(filterFiles(demo,'PRODUCT','Video','large').length,2);assert.equal(filterFiles(demo,'PRODUCT','Documents','any').length,0);assert.equal(filterFiles(demo,'','All files','small').length,7);});
test('human sizes handle zero and boundaries',()=>{assert.equal(bytes(0),'0 B');assert.equal(bytes(1024),'1.0 KB');assert.equal(bytes(1024**3),'1.0 GB');});
