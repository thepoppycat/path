const STATIC_NAMES = [
  /* index 0 to index 4 are canvas ids, must be the same as statics_to_obj */
  "QU", // queue
  "VI", // visited
  "CR", // current
  "NB", // neighbours
  "PA", // path
  /* rest of the items are dynamics commands/identifiers */
  "SIMPLE", // shows that the step is a simple step
  "EC", // erase canvas
  "DP", // draw pixel
  "EP", // erase pixel
  "DA", // draw arrow
  "EA"  // erase arrow
];

/*
{ max_val: 10,
  QU: 0,myUI
  VI: 1,
  CR: 2,
  NB: 3,
  PA: 4,
  SIMPLE: 5,
  EC: 6,
  DP: 7,
  EP: 8,
  DA: 9,
  EA: 10 }
*/
var STATIC = {
  max_val: STATIC_NAMES.length-1
};
STATIC_NAMES.forEach(function(value, i){
  STATIC[value] = i;
})
console.log(STATIC);
/*
Actions
- `dc`, draw canvas
- `ec`, erase canvas
- `dp`, draw pixel
- `ep`, erase pixel
- `ia`, infopane add
- `ie`, infopane erase

*/
const statics_to_obj = {
  0: "queue",
  1: "visited",
  2: "current_YX",
  3: "neighbours",
  4: "path"
}

myUI.run_steps = function(num_steps, step_direction="fwd", virtual=false){
  run_next_step();

  function run_next_step(){
    if(num_steps--){
      if(step_direction!="fwd" && myUI.animation.step>-1)--myUI.animation.step;
      else if(step_direction=="fwd" && myUI.animation.step<myUI.animation.max_step) ++myUI.animation.step;
      else return;
      myUI.planner.get_step(myUI.animation.step, step_direction).then(step=>{
        if(myUI.step_new)
          step = GridPathFinder.unpack_step(step);
        step.forEach(action=>{
          let [command, dest, y, x] = GridPathFinder.unpack_action(action);
          console.log(GridPathFinder.unpack_action(action),action);
          
         

          if(dest==STATIC.CR && command == STATIC.DP ){//draw "current_YX",
            document.getElementById("currentYX").innerHTML =  "( "+x+", "+y+")"; 
           // console.log(x,"x",y,"y","current_YX");
           // info_map_visited(x,y);
            info_map_reset();
            info_map_obstacles(x,y);
            info_map_out_of_bound(x,y);
            info_map_visited(x,y);
           //  console.log(x,"x",y,"y","obstacle drawn");
            
          }

          

          if(dest==STATIC.NB && command == STATIC.DP ){//draw "neighbours"
           // console.log(x,"x",y,"y","neighbours");
            info_map_neighbours_draw(x,y);
          }

          if(dest==STATIC.NB && command == STATIC.EP ){//erase "neighbours"
           // console.log(x,"x",y,"y","neighbours");
            info_map_neighbours_erase(x,y);
             
          }
          if(dest==1 && command == STATIC.DP ){//record  "visiters" in 2d array
            console.log(x,"x",y,"y","visited recorded");
           record_drawn_visited(x,y);
          }
    

       
          if(command==STATIC.EC){
            if(virtual) myUI.tmp.virtual_canvases[statics_to_obj[dest]] = zero2D(myUI.map_height, myUI.map_width);
            else myUI.canvases[statics_to_obj[dest]].erase_canvas();
          }
          else if(command==STATIC.DP){
            if(virtual) myUI.tmp.virtual_canvases[statics_to_obj[dest]][y][x] = 1;
            else myUI.canvases[statics_to_obj[dest]].draw_pixel([y, x]);
            
          }
          else if(command==STATIC.EP){
            if(virtual) myUI.tmp.virtual_canvases[statics_to_obj[dest]][y][x] = 0;
            else myUI.canvases[statics_to_obj[dest]].erase_pixel([y, x]);
          }
          else if(command==STATIC.DA){
            // draw arrow
            ++myUI.arrow.step;
            myUI.arrow.data[myUI.arrow.step].classList.remove("hidden");
          }
          else if(action[0]==STATIC.EA){
            // erase arrow
            myUI.arrow.data[myUI.arrow.step].classList.add("hidden");
            --myUI.arrow.step;
          }
            
          if(dest==STATIC.VI && command == STATIC.DP ){//draw "visiters"
            console.log(x,"x",y,"y","visited drawn");
           // info_map_visited(x,y)
          }
        });
        if(virtual) console.log(myUI.tmp.virtual_canvases.visited);
        run_next_step();
      });
    }
  }
}

/*
steps_arr = [
  each step: 
  [
    each action
    UInt8Array( (5)
      [action_type,args]
    );
  ]
]
*/


myUI.run_combined_step = function(step_direction="fwd"){
  let tmp_step = myUI.animation.step, start_step = myUI.animation.step;
  
  if(step_direction=="fwd") ++tmp_step;
  search_for_simple();
  function search_for_simple(){
    if(step_direction!="fwd"){
      myUI.planner.get_step(tmp_step, true).then(step=>{
        let first_command = (step[0] >> 2) & ((1 << myUI.planner.static_bit_len) - 1);
        if(first_command!=STATIC.SIMPLE && tmp_step>0){
          --tmp_step;
          search_for_simple();
        }
        else{
          --tmp_step;
          myUI.run_steps(start_step - tmp_step, step_direction);
        }
      });
    }
    else{
      myUI.planner.get_step(tmp_step+1).then(step=>{
        let first_command = (step[0] >> 2) & ((1 << myUI.planner.static_bit_len) - 1);
        if(first_command!=STATIC.SIMPLE && tmp_step<myUI.animation.max_step-1){
          ++tmp_step;
          search_for_simple();
        }
        else{
          myUI.run_steps(tmp_step - start_step, step_direction);
        }
      });
    }
  }
}