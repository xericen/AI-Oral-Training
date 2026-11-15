import {describe,it,expect} from 'vitest';
import {isTongueDirectionRule,mouthBounds,summarizeTonguePredictions,tongueClasses,tongueTargetForRule,type TonguePrediction} from './tongue';

const prediction=(label:typeof tongueClasses[number],confidence=.8):TonguePrediction=>({label,confidence,latencyMs:12});

describe('tongue direction model contract',()=>{
 it('keeps the attached seven-class order exactly',()=>{expect([...tongueClasses]).toEqual(['mouth_closed','mouth_open','tongue_down','tongue_left','tongue_middle','tongue_right','tongue_up'])});
 it('maps only externally visible tongue direction rules',()=>{expect(tongueTargetForRule('TONGUE_OUT')).toBe('tongue_middle');expect(tongueTargetForRule('TONGUE_LEFT')).toBe('tongue_left');expect(isTongueDirectionRule('TONGUE_UPPER_INNER')).toBe(false)});
 it('requires a short majority before marking the display stable',()=>{expect(summarizeTonguePredictions([prediction('tongue_left'),prediction('tongue_right')])?.stable).toBe(false);const result=summarizeTonguePredictions([prediction('tongue_right',.7),prediction('tongue_left',.6),prediction('tongue_right',.8),prediction('tongue_right',.9),prediction('tongue_left',.7)]);expect(result).toMatchObject({label:'tongue_right',stable:true,samples:5,votes:3});expect(result?.confidence).toBeCloseTo(.8)});
 it('rejects incomplete face landmarks for a mouth crop',()=>{expect(mouthBounds([],640,480)).toBeNull()});
});
