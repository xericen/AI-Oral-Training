export const overlayStrongConfidence=.45;
export const overlayVisibleConfidence=.25;

export type PoseSegment={from:number;to:number;strong:boolean};

const upperBodyConnections=[
 [5,6],
 [5,7],[7,9],
 [6,8],[8,10],
 [5,11],[6,12],[11,12],
] as const;

export function visiblePosePoint(point:number[]|undefined,minimum=overlayVisibleConfidence){
 return !!point&&point.length>=3&&Number.isFinite(point[0])&&Number.isFinite(point[1])&&Number.isFinite(point[2])&&point[0]>=0&&point[0]<=1&&point[1]>=0&&point[1]<=1&&point[2]>=minimum;
}

export function upperBodySegments(points:number[][]):PoseSegment[]{
 return upperBodyConnections.flatMap(([from,to])=>{
  if(!visiblePosePoint(points[from])||!visiblePosePoint(points[to]))return [];
  return [{from,to,strong:points[from][2]>=overlayStrongConfidence&&points[to][2]>=overlayStrongConfidence}];
 });
}

export function upperBodyPointIds(points:number[][]){
 return [5,6,7,8,9,10,11,12].filter(index=>visiblePosePoint(points[index]));
}
