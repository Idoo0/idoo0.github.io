const photo = (directory,width=1920,height=1440) => ({directory,width,height,fit:'inside',quality:.86});
const logo = {directory:'company_icon',width:256,height:256,fit:'square',quality:.94};
const preview = {width:480,height:480,quality:.92};

export const imagePolicies = {
  hero:{
    portrait:{...photo('images',1200,1600),fallback:'assets/images/portrait.jpg'},
    background:{...photo('images',2880,1800),quality:.9,fallback:'assets/images/hero-landscape.webp'}
  },
  about:{logo:{...logo,fallback:'assets/images/unsrat-logo.png'}},
  experience:{logo,images:{...photo('experience'),preview}},
  projects:{cover:photo('projects',1600,1000),images:photo('projects')},
  achievements:{issuerLogo:logo,image:{...photo('achievements'),preview},images:photo('achievements')}
};
export const maxOriginalImageBytes = 25 * 1024 * 1024;
export const maxWebpBytes = 12 * 1024 * 1024;
