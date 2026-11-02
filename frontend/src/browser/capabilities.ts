import type {Exercise} from '../types';

export interface CapabilityOptions {
 audioMode:boolean;
 experimentalCheek:boolean;
 speechSupported:boolean;
}

export function configureExercises(exercises:Exercise[],options:CapabilityOptions):Exercise[]{
 return exercises.map(exercise=>{
  if(options.audioMode&&options.speechSupported&&exercise.audioText){
   return {...exercise,detection_type:'AUDIO',auto_complete:true};
  }
  if(options.experimentalCheek&&exercise.rule==='CHEEK_PUFF'){
   return {...exercise,detection_type:'FACE',auto_complete:true,experimental:true};
  }
  return {...exercise};
 });
}
