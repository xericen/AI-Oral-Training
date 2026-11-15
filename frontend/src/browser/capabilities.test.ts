import {describe,it,expect} from 'vitest';
import {courses} from './courses';
import {configureExercises} from './capabilities';

const speech=courses.find(course=>course.id==='D')!.exercises;
const mouth=courses.find(course=>course.id==='C')!.exercises;

describe('Browser capability fallbacks',()=>{
 it('uses timer guidance when speech recognition is unavailable',()=>{
  const configured=configureExercises(speech,{audioMode:true,experimentalCheek:false,speechSupported:false});
  expect(configured.filter(exercise=>exercise.audioText).every(exercise=>exercise.detection_type==='TIMER')).toBe(true);
 });
 it('enables audio text checks only when the browser supports them',()=>{
  const configured=configureExercises(speech,{audioMode:true,experimentalCheek:false,speechSupported:true});
  expect(configured.filter(exercise=>exercise.audioText).every(exercise=>exercise.detection_type==='AUDIO')).toBe(true);
 });
 it('limits experimental face detection to cheek puffing',()=>{
  const configured=configureExercises(mouth,{audioMode:false,experimentalCheek:true,speechSupported:true});
  expect(configured.find(exercise=>exercise.rule==='CHEEK_PUFF')?.detection_type).toBe('FACE');
  expect(configured.find(exercise=>exercise.rule==='CHEEK_IN')?.detection_type).toBe('MANUAL');
 });
 it('does not mutate the course definitions',()=>{
  configureExercises(mouth,{audioMode:true,experimentalCheek:true,speechSupported:true});
  expect(mouth.find(exercise=>exercise.rule==='CHEEK_PUFF')?.detection_type).toBe('TIMER');
 });
});
