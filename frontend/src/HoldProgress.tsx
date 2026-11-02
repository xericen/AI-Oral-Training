export default function HoldProgress({label,elapsed,target}:{label:string;elapsed:number;target:number}){
 const safeTarget=Math.max(target,0.1),value=Math.max(0,Math.min(elapsed,safeTarget)),percent=Math.round(value/safeTarget*100);
 return <div className="hold-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={safeTarget} aria-valuenow={Number(value.toFixed(1))}>
  <div className="hold-progress-label"><span>{label}</span><strong>{value.toFixed(1)} <small>/ {safeTarget}초</small></strong></div>
  <div className="hold-progress-track" aria-hidden="true"><span style={{width:percent+'%'}}/></div>
 </div>
}
