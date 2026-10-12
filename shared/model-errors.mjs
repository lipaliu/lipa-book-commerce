// Expose only short provider error fields; never retain raw responses or credentials.
export function providerReason(data,key=''){
 const error=data?.error;let message=typeof error==='string'?error:error?.message||data?.message||data?.msg||'';
 if(typeof message!=='string')return '';
 if(key)message=message.split(key).join('[已隐藏]');
 return message.replace(/Bearer\s+\S+|\b(?:sk|tk)-[A-Za-z0-9_-]+/gi,'[已隐藏]').replace(/https?:\/\/\S+/gi,'[链接已隐藏]').replace(/[\r\n\t]+/g,' ').slice(0,300);
}
export function generationError(status,reason=''){
 const message=({401:'模型服务认证失败，请检查API Key',403:'模型服务拒绝请求（HTTP 403）',402:'模型账号额度不足，请到服务商控制台检查',429:'服务商请求过于频繁，请稍后继续'})[status]||`服务商请求失败（HTTP ${status}），请核对模型权限和参数`;
 return message+(reason?'：'+reason:status===403?'；尚不能确定是权限、额度还是服务商限制':'');
}
