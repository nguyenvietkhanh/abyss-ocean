export const catalog = [
 ['reef-dart','Reef Dart','Common',300000000,'#49dfc5','glide'],
 ['azure-ray','Azure Ray','Rare',500000000,'#57b9ff','ripple'],
 ['ghost-lion','Ghost Lionfish','Epic',1000000000,'#bd8cff','pulse'],
 ['sun-crown','Sun Crown','Legendary',2000000000,'#ffca6a','corona'],
 ['void-dragon','Void Dragon','Mythic',3000000000,'#fb80bf','nebula']
].map(([id,displayName,rarity,price,color,animationRef])=>({id:String(id),displayName:String(displayName),rarity:String(rarity),priceLamports:String(price),appearance:{color:String(color)},animationRef:String(animationRef),active:true,version:1,metadata:{cosmeticOnly:true}}));
export const BASE_STATS = Object.freeze({biomass:10,hp:100,speed:180,stamina:100,immunityMs:5000});
