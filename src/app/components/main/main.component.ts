import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {

  public seatsFileURL = 'https://s3.amazonaws.com/frontend-candidate-homework.lola.co/seats.json';

  public legend = [
    {label: 'Occupied', color: '#dcdddf'},
    {label: 'Available', color: '#1a60e8'},
    {label: 'Selected', color: '#e83697'}
  ];

  public errorMessage = '';

  public rowLayout: Array<string>;

  public planeLayout: Map<string, any>;
  public planeLayoutToDraw = [];

  public currentlySelected: any = {};




  constructor(private httpClient: HttpClient) {}




  ngOnInit() {

    this.httpClient.get(this.seatsFileURL)
    .subscribe((data: any[]) => {

      // initialize the Map that will store the plane layout
      this.planeLayout = new Map();

      // group the data from the input JSON file into cabin classes in the Map
      // as follows:
      // <"Business": <13: <C: true, B: false, ...>, 14: <...> >,
      // "First": <...> >
      this.setUpSeatMap(data);

      // for every cabin class, find out the layout using the seat letters to identify the aisles
      this.determineRowLayoutPerCabinClass();

      // this.planeLayoutToDraw stores the data from the Map so it's rendered in the HTML
      // sort the array by row number so the layout is ordered
      this.planeLayoutToDraw.sort(this.sortAscending);
    },
    (err) => {
        this.errorMessage = 'Error reading input file.';
    });
  }




  setUpSeatMap(data: any[]) {
    data.forEach(slot => {
      const slotClass = slot.class;
      let seats: Map<number, any>;

      if (this.planeLayout.has(slotClass)) {
        seats = this.planeLayout.get(slotClass);

        if (seats.has(slot.row)) {
          seats.get(slot.row).set(slot.seat, slot.occupied);
        } else {
          seats.set(slot.row, new Map([[slot.seat, slot.occupied]]));
        }
      } else {
        seats = new Map();
        seats.set(slot.row, new Map([[slot.seat, slot.occupied]]));
        this.planeLayout.set(slotClass, seats);
      }
    });
  }



  determineRowLayoutPerCabinClass() {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    this.planeLayout.forEach((rows, cabinClass, map) => { // value, key, map

      const randomRow = rows.keys().next();
      const randomRowLayout = rows.get(randomRow.value);
      const seatLetters: Array<string> = Array.from(randomRowLayout.keys());
      seatLetters.sort();

      const index = alphabet.indexOf(seatLetters[seatLetters.length - 1]);
      let rowLayout = alphabet.slice(0, index + 1);

      const regex = new RegExp('([^' + seatLetters + '])', 'g');
      rowLayout = rowLayout.map(place => {
        if (place.match(regex)) {
          return ' ';
        } else {
          return place;
        }
      });

      const numRows = Array.from(this.planeLayout.get(cabinClass).keys());
      numRows.sort((a: number, b: number) => a - b);
      const seats = {
        cabinClass,
        numRows,
        layout: rowLayout
      };
      this.planeLayoutToDraw.push(seats);

    }); // end forEach
  }



  sortAscending(seatA: any, seatB: any) {
    const valueA: number = seatA.numRows[0];
    const valueB: number = seatB.numRows[0];
    return valueA - valueB;
  }




  // determine CSS styling for every seat
  // 'seat' is the square
  // the rest of classes are the colors from the legend
  assignSeatStyle(cabinClass: string, index: number, letter: string) {
    const seatClass = 'seat ';
    if (letter === ' ') {
      return seatClass + 'aisle';
    }
    const seatRow = this.planeLayout.get(cabinClass).get(index);

    return seatClass + (seatRow.get(letter) ? 'occupied' : 'available');
  }





  selectDeselectSeat(cabinClass: string, row: number, letter: string, event: MouseEvent) {
    const currentTarget = event.currentTarget as HTMLElement;

    if (currentTarget.classList.contains('available')) {

      if (this.currentlySelected.hasOwnProperty('row')) { // only if it's not the first time
        // retrieve the one that was previously selected and mark it as free in supermap:
        this.planeLayout.get(this.currentlySelected.cabinClass)
        .get(this.currentlySelected.row)
        .set(this.currentlySelected.letter, false);

        // set style as available:
        this.currentlySelected.currentTarget.classList.add('available');
      }

      // update the values for the selected seat:
      this.currentlySelected = {
        cabinClass,
        row,
        letter,
        currentTarget
      };

      // apply the 'selected' style:
      currentTarget.classList.remove('available');
      currentTarget.classList.add('selected');

    } else if (currentTarget.classList.contains('selected')) {

      // set style as available:
      this.currentlySelected.currentTarget.classList.remove('selected');
      this.currentlySelected.currentTarget.classList.add('available');

      // mark selected seat as nonexistent:
      this.currentlySelected = {};
    }
  }



}
