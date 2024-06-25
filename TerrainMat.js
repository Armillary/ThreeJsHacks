import * as THREE from './three.module.min.js';

/*
Developed by Stephen Waddell for NC State University

As of this version this material can use a hexagonal grid to blend a single material in a manner that preserves interior detail while
allowing for variation over it's surface. This works by overridding parts of the included PhysicalMaterial. This material override was made 
for the purpose of renderring a terrain and its layout follows the specific needs of our project, as a result some features may not be complete
or tested. The intended use is with a diffuse map, normal map, and roughness map, with a supplied height map to aid in blending.

Attributions:

    */

  export default function SetTerrainMaterial(heightMap,material,heightScale,tileScale,hexBlend){
        material.onBeforeCompile = function( shader ){
            shader.uniforms.heightMap = { value: heightMap};
            shader.uniforms.uScale = { value: heightScale};
            shader.uniforms.uRep = { value: tileScale};
            shader.uniforms.uBlend = { value: hexBlend};

            shader.fragmentShader = shader.fragmentShader.replace(`void main() {\n`,`uniform sampler2D heightMap;\nuniform float uScale;\nuniform float uRep;\nuniform float uBlend;\nvec2 hash (float p1,float p2)
{
return fract ( sin (( vec2(p1,p2) ) * mat2 (127.1 , 311.7 , 269.5 , 183.3) )*43758.5453) ;
}\nvec3 HexGrid(vec2 lUv){
vec2 l_hex_uv = lUv * uRep;
vec2 l_hex_base_uv = lUv * uRep;
// Rotate hex grid slightly
l_hex_uv.x += l_hex_uv.y * 0.25;
l_hex_uv.y -= l_hex_uv.x * 0.25;

// Scale hex grid
l_hex_uv = fract(l_hex_uv) * 80.0;

// Tilt hex grid UVs
l_hex_base_uv.x -= l_hex_base_uv.y * 0.5;

// RGB hex Grid
vec2 l_hex_uv_floor = floor(l_hex_base_uv);
vec3 l_grid_rgb = round(fract(((l_hex_uv_floor.r - l_hex_uv_floor.g + 0.00001) + vec3(0.0,1.0,2.0)) / 3.0 + 5.0/3.0));

// Hex gradients
vec2 l_hex_uv_fract = fract(l_hex_base_uv);
float l_hex_gradient_branch = l_hex_uv_fract.x + l_hex_uv_fract.y - 1.0;
vec2 l_hex_gradient_gb = (l_hex_gradient_branch < 0.0 ? l_hex_uv_fract : (1.0 - l_hex_uv_fract.yx));
float l_hex_gradient_r = abs(l_hex_gradient_branch);
vec3 l_hex_gradient_rgb = vec3(l_hex_gradient_r, l_hex_gradient_gb);

// Combine hex colors
vec3 l_hex_grid_rgb = vec3(dot(l_grid_rgb.zxy, l_hex_gradient_rgb),
                           dot(l_grid_rgb.yzx, l_hex_gradient_rgb),
                           dot(l_grid_rgb.xyz, l_hex_gradient_rgb));

float l_hex_sharpness = uBlend;
vec3 l_hex_grid_rgb_pow = vec3(pow(l_hex_grid_rgb.x, l_hex_sharpness),
                                pow(l_hex_grid_rgb.y, l_hex_sharpness),
                                pow(l_hex_grid_rgb.z, l_hex_sharpness));
vec3 l_hex_grid_rgb_sharpen = l_hex_grid_rgb_pow / (l_hex_grid_rgb_pow.r + l_hex_grid_rgb_pow.g + l_hex_grid_rgb_pow.b);

return l_hex_grid_rgb_sharpen;
}\nvec3 height_blend(vec3 p_color_01, vec3 p_color_02, vec3 p_color_03, float p_heightmap_01, float p_heightmap_02, float p_heightmap_03, vec3 p_mask){
vec3 l_heightmap = vec3(p_heightmap_01, p_heightmap_02, p_heightmap_03) * p_mask;

if(l_heightmap.r > l_heightmap.g && l_heightmap.r > l_heightmap.b) return p_color_01;
if(l_heightmap.g > l_heightmap.r && l_heightmap.g > l_heightmap.b) return p_color_02;
if(l_heightmap.b > l_heightmap.r && l_heightmap.b > l_heightmap.g) return p_color_03;

return vec3(0.0,0.0,0.0);
}\nvoid main() {\n
vec3 hexColor = HexGrid(vMapUv);\n
vec2 uv1 = vec2(mod(uRep*vMapUv.x + hash(0.0,0.0).x, 1.0), mod(uRep*vMapUv.y + hash(0.0,0.0).y, 1.0));\n
vec2 uv2 = vec2(mod(uRep*vMapUv.x + hash(0.0,0.0).x, 1.0), mod(uRep*vMapUv.y + hash(1.0,0.0).y, 1.0));\n
vec2 uv3 = vec2(mod(uRep*vMapUv.x + hash(0.0,0.0).x, 1.0), mod(uRep*vMapUv.y + hash(0.0,1.0).y, 1.0));\n
vec2 duvdx = dFdx ( vMapUv*uRep );\n
vec2 duvdy = dFdy ( vMapUv*uRep );\n
vec3 I1 = textureGrad ( map , uv1 , duvdx , duvdy ).rgb ;\n
vec3 I2 = textureGrad ( map , uv2 , duvdx , duvdy ).rgb ;\n
vec3 I3 = textureGrad ( map , uv3 , duvdx , duvdy ).rgb ;\n
vec3 nI1 = textureGrad (normalMap, uv1, duvdx, duvdy ).rgb;\n
vec3 nI2 = textureGrad (normalMap, uv2, duvdx, duvdy ).rgb;\n
vec3 nI3 = textureGrad (normalMap, uv3, duvdx, duvdy ).rgb;\n
vec3 rI1 = textureGrad (roughnessMap, uv1, duvdx, duvdy ).rgb;\n
vec3 rI2 = textureGrad (roughnessMap, uv2, duvdx, duvdy ).rgb;\n
vec3 rI3 = textureGrad (roughnessMap, uv3, duvdx, duvdy ).rgb;\n
vec4 height1 = texture(heightMap,uv1);\n
vec4 height2 = texture(heightMap,uv2);\n
vec4 height3 = texture(heightMap,uv3);\n
hexColor = height_blend(I1,I2,I3,height1.x,height2.x,height3.x,hexColor);\n
vec3 hexNorm = height_blend(nI1,nI2,nI3,height1.x,height2.x,height3.x,hexColor);\n
vec3 hexRough = height_blend(rI1,rI2,rI3,height1.x,height2.x,height3.x,hexColor);\n`);

shader.fragmentShader = shader.fragmentShader.replace(`#include <map_fragment>\n`,`#ifdef USE_MAP\n

vec4 sampledDiffuseColor = texture2D( map, vMapUv );\n

#ifdef DECODE_VIDEO_TEXTURE\n

    // use inline sRGB decode until browsers properly support SRGB8_ALPHA8 with video textures (#26516)\n

    sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );\n

#endif\n

diffuseColor *= vec4(hexColor,1);\n

#endif\n`);

shader.fragmentShader = shader.fragmentShader.replace(`#include <normal_fragment_maps>\n`,`#ifdef USE_NORMALMAP_OBJECTSPACE\n

normal = hexNorm * 2.0 - 1.0; // overrides both flatShading and attribute normals\n

#ifdef FLIP_SIDED\n

    normal = - normal;\n

#endif\n

#ifdef DOUBLE_SIDED\n

    normal = normal * faceDirection;\n

#endif\n

normal = normalize( normalMatrix * normal );\n

#elif defined( USE_NORMALMAP_TANGENTSPACE )\n

vec3 mapN = hexNorm * 2.0 - 1.0;\n
mapN.xy *= normalScale;\n

normal = normalize( tbn * mapN );\n

#elif defined( USE_BUMPMAP )\n

normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );\n

#endif\n`);

shader.fragmentShader = shader.fragmentShader.replace(`#include <roughnessmap_fragment>\n`,`float roughnessFactor = roughness;\n

#ifdef USE_ROUGHNESSMAP\n

vec4 texelRoughness = vec4(hexRough,1);\n

// reads channel G, compatible with a combined OcclusionRoughnessMetallic (RGB) texture\n
roughnessFactor *= texelRoughness.g;\n

#endif\n`);

        }
    }
